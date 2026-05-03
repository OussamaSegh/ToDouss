import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createWorkspaceSchema, updateWorkspaceSchema } from "@todouss/validators";
import { createTRPCRouter, protectedProcedure, workspaceProcedure } from "../trpc";

export const workspaceRouter = createTRPCRouter({
  create: protectedProcedure.input(createWorkspaceSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.workspace.findUnique({ where: { slug: input.slug } });
    if (existing) {
      throw new TRPCError({ code: "CONFLICT", message: "Workspace slug already taken" });
    }

    const dbUser = await ctx.db.user.findUnique({ where: { clerkId: ctx.userId! } });
    if (!dbUser) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

    const workspace = await ctx.db.workspace.create({
      data: {
        name: input.name,
        slug: input.slug,
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
    if (!dbUser) return [];

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
      const dbUser = await ctx.db.user.findUnique({ where: { clerkId: ctx.userId! } });
      if (!dbUser) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.user.update({
        where: { id: dbUser.id },
        data: { onboardedAt: new Date() },
      });
    }),
});
