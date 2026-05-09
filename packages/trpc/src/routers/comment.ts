import { TRPCError } from "@trpc/server";
import { Prisma } from "@todouss/db";
import {
  createCommentSchema,
  updateCommentSchema,
  deleteCommentSchema,
  listCommentsSchema,
  reactToCommentSchema,
  unreactToCommentSchema,
} from "@todouss/validators";
import { createTRPCRouter, workspaceProcedure } from "../trpc";
import { ensureDbUser } from "../lib/ensure-db-user";
import { parseMentionUserIdsFromBody } from "../lib/mentions";
import { publishTaskEvent, publishWorkspaceEvent } from "../lib/realtime";
import { assertTaskProjectAccess } from "../lib/task-project-scope";

function canModerate(role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER") {
  return role === "OWNER" || role === "ADMIN";
}

export const commentRouter = createTRPCRouter({
  listByTask: workspaceProcedure
    .input(listCommentsSchema)
    .query(async ({ ctx, input }) => {
      const task = await ctx.db.task.findUnique({
        where: { id: input.taskId, workspaceId: ctx.workspaceId },
        select: { id: true, projectId: true },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      await assertTaskProjectAccess(
        ctx.db,
        ctx.workspaceId,
        ctx.member.userId,
        ctx.member.role,
        task.projectId,
      );

      return ctx.db.comment.findMany({
        where: { taskId: input.taskId },
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
          mentions: {
            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          },
          reactions: true,
        },
      });
    }),

  create: workspaceProcedure
    .input(createCommentSchema)
    .mutation(async ({ ctx, input }) => {
      const dbUser = await ensureDbUser(ctx);
      const task = await ctx.db.task.findUnique({
        where: { id: input.taskId, workspaceId: ctx.workspaceId },
        select: { id: true, title: true, projectId: true },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      await assertTaskProjectAccess(
        ctx.db,
        ctx.workspaceId,
        ctx.member.userId,
        ctx.member.role,
        task.projectId,
      );

      const rawMentionIds = parseMentionUserIdsFromBody(input.body).filter(
        (id) => id !== dbUser.id,
      );
      const mentionUsers = rawMentionIds.length
        ? await ctx.db.workspaceMember.findMany({
            where: {
              workspaceId: ctx.workspaceId,
              userId: { in: rawMentionIds },
            },
            select: { userId: true },
          })
        : [];
      const mentionUserIds = [...new Set(mentionUsers.map((m) => m.userId))];

      const comment = await ctx.db.$transaction(async (tx) => {
        const created = await tx.comment.create({
          data: {
            taskId: input.taskId,
            authorId: dbUser.id,
            body: input.body,
            mentions: mentionUserIds.length
              ? {
                  createMany: {
                    data: mentionUserIds.map((userId) => ({ userId })),
                    skipDuplicates: true,
                  },
                }
              : undefined,
          },
          include: {
            author: { select: { id: true, name: true, avatarUrl: true } },
            mentions: {
              include: {
                user: { select: { id: true, name: true, avatarUrl: true } },
              },
            },
            reactions: true,
          },
        });

        await tx.activityLog.create({
          data: {
            taskId: input.taskId,
            actorId: dbUser.id,
            type: "COMMENT_ADDED",
            meta: { commentId: created.id },
          },
        });

        if (mentionUserIds.length) {
          await tx.notification.createMany({
            data: mentionUserIds.map((userId) => ({
              userId,
              type: "MENTION",
              title: `${dbUser.name ?? "Someone"} mentioned you`,
              body: `In task: ${task.title}`,
              meta: {
                workspaceId: ctx.workspaceId,
                taskId: input.taskId,
                commentId: created.id,
              } satisfies Prisma.InputJsonValue,
            })),
            skipDuplicates: true,
          });
        }

        return created;
      });

      await publishTaskEvent(input.taskId, "comment.created", {
        actorId: dbUser.id,
        workspaceId: ctx.workspaceId,
        taskId: input.taskId,
        commentId: comment.id,
        updatedAt: comment.updatedAt.toISOString(),
      });
      await publishWorkspaceEvent(ctx.workspaceId, "notification.created", {
        actorId: dbUser.id,
        workspaceId: ctx.workspaceId,
        taskId: input.taskId,
        commentId: comment.id,
        mentionUserIds,
        updatedAt: comment.updatedAt.toISOString(),
      });

      return comment;
    }),

  update: workspaceProcedure
    .input(updateCommentSchema)
    .mutation(async ({ ctx, input }) => {
      const dbUser = await ensureDbUser(ctx);

      const comment = await ctx.db.comment.findUnique({
        where: { id: input.commentId },
        include: { task: { select: { id: true, workspaceId: true, title: true, projectId: true } } },
      });
      if (!comment || comment.task.workspaceId !== ctx.workspaceId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await assertTaskProjectAccess(
        ctx.db,
        ctx.workspaceId,
        ctx.member.userId,
        ctx.member.role,
        comment.task.projectId,
      );
      if (comment.authorId !== dbUser.id && !canModerate(ctx.member.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const rawMentionIds = parseMentionUserIdsFromBody(input.body).filter(
        (id) => id !== dbUser.id,
      );
      const mentionUsers = rawMentionIds.length
        ? await ctx.db.workspaceMember.findMany({
            where: {
              workspaceId: ctx.workspaceId,
              userId: { in: rawMentionIds },
            },
            select: { userId: true },
          })
        : [];
      const mentionUserIds = [...new Set(mentionUsers.map((m) => m.userId))];

      const updated = await ctx.db.$transaction(async (tx) => {
        await tx.mention.deleteMany({ where: { commentId: input.commentId } });
        const next = await tx.comment.update({
          where: { id: input.commentId },
          data: {
            body: input.body,
            isEdited: true,
            editedAt: new Date(),
            mentions: mentionUserIds.length
              ? {
                  createMany: {
                    data: mentionUserIds.map((userId) => ({ userId })),
                    skipDuplicates: true,
                  },
                }
              : undefined,
          },
          include: {
            author: { select: { id: true, name: true, avatarUrl: true } },
            mentions: {
              include: {
                user: { select: { id: true, name: true, avatarUrl: true } },
              },
            },
            reactions: true,
          },
        });

        if (mentionUserIds.length) {
          await tx.notification.createMany({
            data: mentionUserIds.map((userId) => ({
              userId,
              type: "MENTION",
              title: `${dbUser.name ?? "Someone"} mentioned you`,
              body: `In task: ${comment.task.title}`,
              meta: {
                workspaceId: ctx.workspaceId,
                taskId: comment.taskId,
                commentId: next.id,
              } satisfies Prisma.InputJsonValue,
            })),
            skipDuplicates: true,
          });
        }
        return next;
      });

      await publishTaskEvent(comment.taskId, "comment.updated", {
        actorId: dbUser.id,
        workspaceId: ctx.workspaceId,
        taskId: comment.taskId,
        commentId: updated.id,
        updatedAt: updated.updatedAt.toISOString(),
      });

      return updated;
    }),

  delete: workspaceProcedure
    .input(deleteCommentSchema)
    .mutation(async ({ ctx, input }) => {
      const dbUser = await ensureDbUser(ctx);
      const comment = await ctx.db.comment.findUnique({
        where: { id: input.commentId },
        include: { task: { select: { workspaceId: true, projectId: true } } },
      });
      if (!comment || comment.task.workspaceId !== ctx.workspaceId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await assertTaskProjectAccess(
        ctx.db,
        ctx.workspaceId,
        ctx.member.userId,
        ctx.member.role,
        comment.task.projectId,
      );
      if (comment.authorId !== dbUser.id && !canModerate(ctx.member.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await ctx.db.comment.delete({ where: { id: input.commentId } });

      await publishTaskEvent(comment.taskId, "comment.deleted", {
        actorId: dbUser.id,
        workspaceId: ctx.workspaceId,
        taskId: comment.taskId,
        commentId: comment.id,
        updatedAt: new Date().toISOString(),
      });

      return { success: true };
    }),

  react: workspaceProcedure
    .input(reactToCommentSchema)
    .mutation(async ({ ctx, input }) => {
      const dbUser = await ensureDbUser(ctx);
      const comment = await ctx.db.comment.findUnique({
        where: { id: input.commentId },
        include: { task: { select: { workspaceId: true, id: true, projectId: true } } },
      });
      if (!comment || comment.task.workspaceId !== ctx.workspaceId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await assertTaskProjectAccess(
        ctx.db,
        ctx.workspaceId,
        ctx.member.userId,
        ctx.member.role,
        comment.task.projectId,
      );

      const reaction = await ctx.db.commentReaction.upsert({
        where: {
          commentId_userId_emoji: {
            commentId: input.commentId,
            userId: dbUser.id,
            emoji: input.emoji,
          },
        },
        update: {},
        create: {
          commentId: input.commentId,
          userId: dbUser.id,
          emoji: input.emoji,
        },
      });

      return reaction;
    }),

  unreact: workspaceProcedure
    .input(unreactToCommentSchema)
    .mutation(async ({ ctx, input }) => {
      const dbUser = await ensureDbUser(ctx);
      const comment = await ctx.db.comment.findUnique({
        where: { id: input.commentId },
        include: { task: { select: { workspaceId: true, projectId: true } } },
      });
      if (!comment || comment.task.workspaceId !== ctx.workspaceId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await assertTaskProjectAccess(
        ctx.db,
        ctx.workspaceId,
        ctx.member.userId,
        ctx.member.role,
        comment.task.projectId,
      );

      await ctx.db.commentReaction.deleteMany({
        where: {
          commentId: input.commentId,
          userId: dbUser.id,
          emoji: input.emoji,
        },
      });

      return { success: true };
    }),
});
