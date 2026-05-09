import { TRPCError } from "@trpc/server";
import {
  assertKeyMatchesTask,
  buildObjectKey,
  deleteObjectByKey,
  isObjectStorageConfigured,
  presignPutUpload,
  publicUrlForKey,
} from "@todouss/storage";
import {
  attachmentCompleteSchema,
  attachmentDeleteSchema,
  attachmentPrepareSchema,
} from "@todouss/validators";
import { createTRPCRouter, workspaceProcedure } from "../trpc";
import { assertStorageWithinPlan } from "../lib/plan-limits";
import { assertTaskProjectAccess } from "../lib/task-project-scope";
import { ensureDbUser } from "../lib/ensure-db-user";

export const attachmentRouter = createTRPCRouter({
  prepareUpload: workspaceProcedure
    .input(attachmentPrepareSchema)
    .mutation(async ({ ctx, input }) => {
      if (!isObjectStorageConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "File uploads are not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.",
        });
      }
      const task = await ctx.db.task.findFirst({
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

      await assertStorageWithinPlan(ctx.db, ctx.workspaceId, ctx.workspace.plan, input.sizeBytes);

      const key = buildObjectKey(ctx.workspaceId, input.taskId, input.fileName);
      const uploadUrl = await presignPutUpload({
        key,
        contentType: input.mimeType,
        contentLength: input.sizeBytes,
      });
      const publicBase = publicUrlForKey(key);
      if (!publicBase) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "NEXT_PUBLIC_R2_PUBLIC_URL is not set.",
        });
      }
      return { uploadUrl, key, publicUrl: publicBase };
    }),

  completeUpload: workspaceProcedure
    .input(attachmentCompleteSchema)
    .mutation(async ({ ctx, input }) => {
      if (!isObjectStorageConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "File uploads are not configured.",
        });
      }
      if (!assertKeyMatchesTask(input.key, ctx.workspaceId, input.taskId)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid object key." });
      }
      const task = await ctx.db.task.findFirst({
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

      await assertStorageWithinPlan(ctx.db, ctx.workspaceId, ctx.workspace.plan, input.sizeBytes);

      const dbUser = await ensureDbUser(ctx);
      const url = publicUrlForKey(input.key);
      if (!url) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "NEXT_PUBLIC_R2_PUBLIC_URL is not set.",
        });
      }

      const attachment = await ctx.db.$transaction(async (tx) => {
        const row = await tx.attachment.create({
          data: {
            taskId: input.taskId,
            uploaderId: dbUser.id,
            name: input.fileName,
            url,
            key: input.key,
            mimeType: input.mimeType,
            size: input.sizeBytes,
          },
        });
        await tx.workspace.update({
          where: { id: ctx.workspaceId },
          data: { storageUsed: { increment: input.sizeBytes } },
        });
        await tx.activityLog.create({
          data: {
            taskId: input.taskId,
            actorId: dbUser.id,
            type: "ATTACHMENT_ADDED",
            meta: { attachmentId: row.id, name: input.fileName },
          },
        });
        return row;
      });

      return attachment;
    }),

  remove: workspaceProcedure
    .input(attachmentDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      const att = await ctx.db.attachment.findFirst({
        where: { id: input.attachmentId },
        include: { task: { select: { workspaceId: true, id: true } } },
      });
      if (!att || att.task.workspaceId !== ctx.workspaceId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const dbUser = await ensureDbUser(ctx);

      if (isObjectStorageConfigured()) {
        try {
          await deleteObjectByKey(att.key);
        } catch (e) {
          console.error("R2 delete failed", e);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to remove file from storage.",
          });
        }
      }

      await ctx.db.$transaction(async (tx) => {
        await tx.attachment.delete({ where: { id: att.id } });
        await tx.workspace.update({
          where: { id: ctx.workspaceId },
          data: { storageUsed: { decrement: att.size } },
        });
        await tx.activityLog.create({
          data: {
            taskId: att.taskId,
            actorId: dbUser.id,
            type: "ATTACHMENT_REMOVED",
            meta: { attachmentId: att.id, name: att.name },
          },
        });
      });

      return { success: true as const };
    }),
});
