import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { clerkClient } from "@clerk/nextjs/server";
import { createWorkspaceSchema, updateWorkspaceSchema } from "@todouss/validators";
import { createTRPCRouter, protectedProcedure, workspaceProcedure } from "../trpc";
import { ensureDbUser } from "../lib/ensure-db-user";

export const workspaceRouter = createTRPCRouter({
  create: protectedProcedure.input(createWorkspaceSchema).mutation(async ({ ctx, input }) => {
    let finalSlug = input.slug;
    const existing = await ctx.db.workspace.findUnique({ where: { slug: finalSlug } });
    if (existing) {
      // Auto-resolve collisions for default/generated slugs so onboarding
      // doesn't fail with a recoverable conflict.
      for (let i = 2; i <= 50; i += 1) {
        const candidate = `${input.slug}-${i}`;
        const taken = await ctx.db.workspace.findUnique({ where: { slug: candidate } });
        if (!taken) {
          finalSlug = candidate;
          break;
        }
      }
      if (finalSlug === input.slug) {
        throw new TRPCError({ code: "CONFLICT", message: "Workspace slug already taken" });
      }
    }

    const dbUser = await ensureDbUser(ctx);

    const workspace = await ctx.db.workspace.create({
      data: {
        name: input.name,
        slug: finalSlug,
        ownerId: dbUser.id,
        members: {
          create: {
            userId: dbUser.id,
            role: "OWNER",
          },
        },
        projects: {
          create: {
            name: "Inbox",
            icon: "inbox",
            color: "#6366f1",
            isInbox: true,
          },
        },
      },
    });

    return workspace;
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const dbUser = await ctx.db.user.findUnique({ where: { clerkId: ctx.userId! } });
    if (!dbUser) return []; // not yet synced, return empty gracefully

    const memberships = await ctx.db.workspaceMember.findMany({
      where: { userId: dbUser.id },
      include: { workspace: true },
      orderBy: { joinedAt: "asc" },
    });

    return memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
    }));
  }),

  get: workspaceProcedure
    .input(z.object({ workspaceId: z.string().cuid() }))
    .query(({ ctx }) => ctx.workspace),

  update: workspaceProcedure
    .input(updateWorkspaceSchema.extend({ workspaceId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.member.role !== "OWNER" && ctx.member.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { workspaceId, ...data } = input;
      return ctx.db.workspace.update({ where: { id: workspaceId }, data });
    }),

  completeOnboarding: protectedProcedure
    .input(z.object({ workspaceId: z.string().cuid() }))
    .mutation(async ({ ctx }) => {
      const dbUser = await ensureDbUser(ctx);

      // Mark onboarded in DB
      await ctx.db.user.update({
        where: { id: dbUser.id },
        data: { onboardedAt: new Date() },
      });

      // Keep Clerk metadata aligned, but don't block onboarding completion if
      // Clerk metadata propagation/errors are transient.
      try {
        const client = await clerkClient();
        await client.users.updateUserMetadata(ctx.userId!, {
          publicMetadata: { onboarded: true },
        });
      } catch (error) {
        console.warn("Failed to update Clerk onboarding metadata", error);
      }

      return { success: true };
    }),

  members: workspaceProcedure
    .input(z.object({ workspaceId: z.string().cuid() }))
    .query(async ({ ctx }) => {
      const members = await ctx.db.workspaceMember.findMany({
        where: { workspaceId: ctx.workspaceId },
        include: {
          user: {
            select: {
              id: true,
              clerkId: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      });
      return members;
    }),
});
