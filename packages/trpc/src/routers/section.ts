import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createSectionSchema,
  updateSectionSchema,
  reorderSectionSchema,
} from "@todouss/validators";
import { createTRPCRouter, workspaceProcedure } from "../trpc";
import { assertProjectIdAccessible } from "../lib/task-project-scope";

async function assertProjectInWorkspace(
  ctx: { db: import("@todouss/db").PrismaClient; workspaceId: string; member: { userId: string; role: import("@todouss/db").WorkspaceRole } },
  projectId: string,
) {
  const project = await ctx.db.project.findFirst({
    where: { id: projectId, workspaceId: ctx.workspaceId },
  });
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found in workspace" });
  await assertProjectIdAccessible(
    ctx.db,
    ctx.workspaceId,
    ctx.member.userId,
    ctx.member.role,
    projectId,
  );
  return project;
}

export const sectionRouter = createTRPCRouter({
  list: workspaceProcedure
    .input(z.object({ workspaceId: z.string().cuid(), projectId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      await assertProjectInWorkspace(ctx, input.projectId);
      return ctx.db.section.findMany({
        where: { projectId: input.projectId },
        orderBy: { sortOrder: "asc" },
      });
    }),

  create: workspaceProcedure.input(createSectionSchema).mutation(async ({ ctx, input }) => {
    await assertProjectInWorkspace(ctx, input.projectId);
    const maxOrder = await ctx.db.section.findFirst({
      where: { projectId: input.projectId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    return ctx.db.section.create({
      data: {
        projectId: input.projectId,
        name: input.name,
        color: input.color,
        sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      },
    });
  }),

  update: workspaceProcedure
    .input(updateSectionSchema.extend({ workspaceId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id, workspaceId: _wid, ...data } = input;
      const existing = await ctx.db.section.findUnique({
        where: { id },
        include: { project: { select: { workspaceId: true } } },
      });
      if (!existing || existing.project.workspaceId !== ctx.workspaceId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return ctx.db.section.update({ where: { id }, data });
    }),

  reorder: workspaceProcedure
    .input(reorderSectionSchema.extend({ workspaceId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.section.findUnique({
        where: { id: input.id },
        include: { project: { select: { workspaceId: true } } },
      });
      if (!existing || existing.project.workspaceId !== ctx.workspaceId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return ctx.db.section.update({
        where: { id: input.id },
        data: { sortOrder: input.newSortOrder },
      });
    }),

  delete: workspaceProcedure
    .input(z.object({ workspaceId: z.string().cuid(), sectionId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.section.findUnique({
        where: { id: input.sectionId },
        include: { project: { select: { workspaceId: true } } },
      });
      if (!existing || existing.project.workspaceId !== ctx.workspaceId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return ctx.db.section.delete({ where: { id: input.sectionId } });
    }),
});
