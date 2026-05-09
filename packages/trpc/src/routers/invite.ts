import { TRPCError } from "@trpc/server";
import { Prisma } from "@todouss/db";
import {
  createInviteSchema,
  listInvitesSchema,
  resendInviteSchema,
  revokeInviteSchema,
  acceptInviteSchema,
} from "@todouss/validators";
import { createTRPCRouter, protectedProcedure, workspaceProcedure } from "../trpc";
import { ensureDbUser } from "../lib/ensure-db-user";
import { publishWorkspaceEvent } from "../lib/realtime";
import { assertCanAddWorkspaceMember } from "../lib/plan-limits";

function canManageInvites(role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER") {
  return role === "OWNER" || role === "ADMIN";
}

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export const inviteRouter = createTRPCRouter({
  listPending: workspaceProcedure
    .input(listInvitesSchema)
    .query(async ({ ctx }) => {
      if (!canManageInvites(ctx.member.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return ctx.db.workspaceInvite.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: workspaceProcedure
    .input(createInviteSchema)
    .mutation(async ({ ctx, input }) => {
      if (!canManageInvites(ctx.member.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const dbUser = await ensureDbUser(ctx);

      await assertCanAddWorkspaceMember(ctx.db, ctx.workspaceId, ctx.workspace.plan);

      const existingMember = await ctx.db.user.findUnique({
        where: { email: input.email.toLowerCase() },
        select: { id: true },
      });
      if (existingMember) {
        const alreadyMember = await ctx.db.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: ctx.workspaceId,
              userId: existingMember.id,
            },
          },
          select: { id: true },
        });
        if (alreadyMember) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "User is already a workspace member",
          });
        }
      }

      const pending = await ctx.db.workspaceInvite.findFirst({
        where: {
          workspaceId: ctx.workspaceId,
          email: input.email.toLowerCase(),
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (pending) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "There is already an active invite for this email",
        });
      }

      const invite = await ctx.db.workspaceInvite.create({
        data: {
          workspaceId: ctx.workspaceId,
          email: input.email.toLowerCase(),
          role: input.role,
          expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        },
      });

      if (existingMember) {
        await ctx.db.notification.create({
          data: {
            userId: existingMember.id,
            type: "WORKSPACE_INVITE",
            title: `You were invited to ${ctx.workspace.name}`,
            body: `${dbUser.name ?? "A teammate"} invited you as ${input.role.toLowerCase()}.`,
            meta: {
              workspaceId: ctx.workspaceId,
              inviteId: invite.id,
              token: invite.token,
            } satisfies Prisma.InputJsonValue,
          },
        });
      }

      await publishWorkspaceEvent(ctx.workspaceId, "invite.created", {
        actorId: dbUser.id,
        workspaceId: ctx.workspaceId,
        inviteId: invite.id,
        email: invite.email,
        updatedAt: invite.createdAt.toISOString(),
      });

      return invite;
    }),

  resend: workspaceProcedure
    .input(resendInviteSchema)
    .mutation(async ({ ctx, input }) => {
      if (!canManageInvites(ctx.member.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const dbUser = await ensureDbUser(ctx);

      const invite = await ctx.db.workspaceInvite.findFirst({
        where: {
          id: input.inviteId,
          workspaceId: ctx.workspaceId,
          acceptedAt: null,
        },
      });
      if (!invite) throw new TRPCError({ code: "NOT_FOUND" });

      const updated = await ctx.db.workspaceInvite.update({
        where: { id: invite.id },
        data: { expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
      });

      await publishWorkspaceEvent(ctx.workspaceId, "invite.resent", {
        actorId: dbUser.id,
        workspaceId: ctx.workspaceId,
        inviteId: updated.id,
        email: updated.email,
        updatedAt: new Date().toISOString(),
      });

      return updated;
    }),

  revoke: workspaceProcedure
    .input(revokeInviteSchema)
    .mutation(async ({ ctx, input }) => {
      if (!canManageInvites(ctx.member.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const dbUser = await ensureDbUser(ctx);

      const invite = await ctx.db.workspaceInvite.findFirst({
        where: {
          id: input.inviteId,
          workspaceId: ctx.workspaceId,
          acceptedAt: null,
        },
      });
      if (!invite) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db.workspaceInvite.delete({ where: { id: invite.id } });

      await publishWorkspaceEvent(ctx.workspaceId, "invite.revoked", {
        actorId: dbUser.id,
        workspaceId: ctx.workspaceId,
        inviteId: invite.id,
        email: invite.email,
        updatedAt: new Date().toISOString(),
      });

      return { success: true };
    }),

  accept: protectedProcedure
    .input(acceptInviteSchema)
    .mutation(async ({ ctx, input }) => {
      const dbUser = await ensureDbUser(ctx);

      const invite = await ctx.db.workspaceInvite.findUnique({
        where: { token: input.token },
        include: { workspace: true },
      });
      if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
      if (invite.acceptedAt) {
        throw new TRPCError({ code: "CONFLICT", message: "Invite already accepted" });
      }
      if (invite.expiresAt <= new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invite expired" });
      }
      if (invite.email.toLowerCase() !== dbUser.email.toLowerCase()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Invite email does not match your account",
        });
      }

      await assertCanAddWorkspaceMember(ctx.db, invite.workspaceId, invite.workspace.plan);

      await ctx.db.$transaction(async (tx) => {
        await tx.workspaceMember.upsert({
          where: {
            workspaceId_userId: {
              workspaceId: invite.workspaceId,
              userId: dbUser.id,
            },
          },
          update: { role: invite.role },
          create: {
            workspaceId: invite.workspaceId,
            userId: dbUser.id,
            role: invite.role,
          },
        });
        await tx.workspaceInvite.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date() },
        });

        await tx.notification.create({
          data: {
            userId: invite.workspace.ownerId,
            type: "INVITE_ACCEPTED",
            title: `${dbUser.name ?? dbUser.email} joined ${invite.workspace.name}`,
            body: `${dbUser.email} accepted the workspace invite.`,
            meta: {
              workspaceId: invite.workspaceId,
              inviteId: invite.id,
              userId: dbUser.id,
            } satisfies Prisma.InputJsonValue,
          },
        });
      });

      await publishWorkspaceEvent(invite.workspaceId, "invite.accepted", {
        actorId: dbUser.id,
        workspaceId: invite.workspaceId,
        inviteId: invite.id,
        updatedAt: new Date().toISOString(),
      });

      return { success: true, workspaceSlug: invite.workspace.slug };
    }),
});
