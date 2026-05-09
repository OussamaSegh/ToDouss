import { TRPCError } from "@trpc/server";
import {
  applySavedViewSchema,
  createSavedViewSchema,
  deleteSavedViewSchema,
  listSavedViewSchema,
  reorderSavedViewSchema,
  updateSavedViewSchema,
} from "@todouss/validators";
import { createTRPCRouter, workspaceProcedure } from "../trpc";
import { assertProjectIdAccessible } from "../lib/task-project-scope";

export const savedViewRouter = createTRPCRouter({
  list: workspaceProcedure.input(listSavedViewSchema).query(async ({ ctx, input }) => {
    const dbUser = await ctx.db.user.findUnique({ where: { clerkId: ctx.userId } });
    if (!dbUser) throw new TRPCError({ code: "NOT_FOUND" });

    if (input.projectId) {
      await assertProjectIdAccessible(
        ctx.db,
        ctx.workspaceId,
        ctx.member.userId,
        ctx.member.role,
        input.projectId,
      );
    }

    return ctx.db.savedView.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        ...(input.projectId ? { projectId: input.projectId } : {}),
        ...(input.includeShared
          ? { OR: [{ creatorId: dbUser.id }, { isShared: true }] }
          : { creatorId: dbUser.id }),
      },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });
  }),

  create: workspaceProcedure.input(createSavedViewSchema).mutation(async ({ ctx, input }) => {
    const dbUser = await ctx.db.user.findUnique({ where: { clerkId: ctx.userId } });
    if (!dbUser) throw new TRPCError({ code: "NOT_FOUND" });

    if (input.projectId) {
      await assertProjectIdAccessible(
        ctx.db,
        ctx.workspaceId,
        ctx.member.userId,
        ctx.member.role,
        input.projectId,
      );
    }

    const maxOrder = await ctx.db.savedView.findFirst({
      where: { workspaceId: ctx.workspaceId, projectId: input.projectId ?? null, creatorId: dbUser.id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    return ctx.db.savedView.create({
      data: {
        workspaceId: ctx.workspaceId,
        creatorId: dbUser.id,
        projectId: input.projectId ?? null,
        name: input.name,
        filters: input.filters,
        viewType: input.viewType,
        sortBy: input.sortBy,
        sortDir: input.sortDir,
        groupBy: input.groupBy ?? null,
        isShared: input.isShared,
        sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      },
    });
  }),

  update: workspaceProcedure.input(updateSavedViewSchema).mutation(async ({ ctx, input }) => {
    const dbUser = await ctx.db.user.findUnique({ where: { clerkId: ctx.userId } });
    if (!dbUser) throw new TRPCError({ code: "NOT_FOUND" });

    const existing = await ctx.db.savedView.findUnique({
      where: { id: input.id, workspaceId: ctx.workspaceId },
    });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    if (existing.creatorId !== dbUser.id && !existing.isShared) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const { id, workspaceId: _wid, ...data } = input;
    return ctx.db.savedView.update({
      where: { id, workspaceId: ctx.workspaceId },
      data: { ...data, groupBy: data.groupBy === undefined ? undefined : data.groupBy ?? null },
    });
  }),

  delete: workspaceProcedure.input(deleteSavedViewSchema).mutation(async ({ ctx, input }) => {
    const dbUser = await ctx.db.user.findUnique({ where: { clerkId: ctx.userId } });
    if (!dbUser) throw new TRPCError({ code: "NOT_FOUND" });

    const existing = await ctx.db.savedView.findUnique({
      where: { id: input.id, workspaceId: ctx.workspaceId },
    });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    if (existing.creatorId !== dbUser.id) throw new TRPCError({ code: "FORBIDDEN" });

    return ctx.db.savedView.delete({ where: { id: input.id, workspaceId: ctx.workspaceId } });
  }),

  resolve: workspaceProcedure.input(applySavedViewSchema).query(async ({ ctx, input }) => {
    const dbUser = await ctx.db.user.findUnique({ where: { clerkId: ctx.userId } });
    if (!dbUser) throw new TRPCError({ code: "NOT_FOUND" });

    const view = await ctx.db.savedView.findUnique({
      where: { id: input.id, workspaceId: ctx.workspaceId },
    });
    if (!view) throw new TRPCError({ code: "NOT_FOUND" });
    if (!view.isShared && view.creatorId !== dbUser.id) throw new TRPCError({ code: "FORBIDDEN" });

    if (view.projectId) {
      await assertProjectIdAccessible(
        ctx.db,
        ctx.workspaceId,
        ctx.member.userId,
        ctx.member.role,
        view.projectId,
      );
    }

    return view;
  }),

  reorder: workspaceProcedure.input(reorderSavedViewSchema).mutation(async ({ ctx, input }) => {
    const dbUser = await ctx.db.user.findUnique({ where: { clerkId: ctx.userId } });
    if (!dbUser) throw new TRPCError({ code: "NOT_FOUND" });

    const owned = await ctx.db.savedView.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        id: { in: input.orderedIds },
        creatorId: dbUser.id,
      },
      select: { id: true },
    });
    if (owned.length !== input.orderedIds.length) throw new TRPCError({ code: "FORBIDDEN" });

    await ctx.db.$transaction(
      input.orderedIds.map((id, idx) =>
        ctx.db.savedView.update({
          where: { id, workspaceId: ctx.workspaceId },
          data: { sortOrder: idx },
        }),
      ),
    );
    return { success: true };
  }),
});
