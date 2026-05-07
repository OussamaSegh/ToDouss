import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { clerkClient } from "@clerk/nextjs/server";
import { createWorkspaceSchema, updateWorkspaceSchema } from "@todouss/validators";
import { createTRPCRouter, protectedProcedure, workspaceProcedure } from "../trpc";

/** Ensures a DB user row exists for the current Clerk user (webhook fallback). */
async function ensureDbUser(ctx: { db: import("@todouss/db").PrismaClient; userId: string | null | undefined }) {
  if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
  const existing = await ctx.db.user.findUnique({ where: { clerkId: ctx.userId } });
  if (existing) return existing;

  // Webhook hasn't synced yet — fetch from Clerk and create
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(ctx.userId);
  const primaryEmail = clerkUser.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId,
  )?.emailAddress;
  if (!primaryEmail) throw new TRPCError({ code: "BAD_REQUEST", message: "No primary email on Clerk user" });

  return ctx.db.user.create({
    data: {
      clerkId: ctx.userId,
      email: primaryEmail,
      name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null,
      avatarUrl: clerkUser.imageUrl || null,
    },
  });
}

export const workspaceRouter = createTRPCRouter({
  create: protectedProcedure.input(createWorkspaceSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.workspace.findUnique({ where: { slug: input.slug } });
    if (existing) {
      throw new TRPCError({ code: "CONFLICT", message: "Workspace slug already taken" });
    }

    const dbUser = await ensureDbUser(ctx);

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

      // Set Clerk publicMetadata so middleware lets the user through
      const client = await clerkClient();
      await client.users.updateUserMetadata(ctx.userId!, {
        publicMetadata: { onboarded: true },
      });

      return { success: true };
    }),
});
