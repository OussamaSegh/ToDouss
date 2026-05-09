import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { buildVisibleProjectWhere } from "@todouss/db";
import { createProjectSchema, updateProjectSchema } from "@todouss/validators";
import { createTRPCRouter, workspaceProcedure } from "../trpc";
import { assertCanCreateProject } from "../lib/plan-limits";

export const projectRouter = createTRPCRouter({
  list: workspaceProcedure
    .input(z.object({ workspaceId: z.string().cuid() }))
    .query(async ({ ctx }) => {
      const where = await buildVisibleProjectWhere(
        ctx.db,
        ctx.workspaceId,
        ctx.member.userId,
        ctx.member.role,
      );
      return ctx.db.project.findMany({
        where,
        orderBy: { sortOrder: "asc" },
      });
    }),

  create: workspaceProcedure
    .input(createProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const dbUser = await ctx.db.user.findUnique({ where: { clerkId: ctx.userId } });
      if (!dbUser) throw new TRPCError({ code: "NOT_FOUND" });

      await assertCanCreateProject(ctx.db, ctx.workspaceId, ctx.workspace.plan);

      const maxOrder = await ctx.db.project.findFirst({
        where: { workspaceId: ctx.workspaceId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });

      return ctx.db.project.create({
        data: {
          workspaceId: ctx.workspaceId,
          name: input.name,
          description: input.description,
          color: input.color,
          icon: input.icon,
          isPrivate: input.isPrivate,
          sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
          members: {
            create: { userId: dbUser.id, role: "ADMIN" },
          },
        },
      });
    }),

  update: workspaceProcedure
    .input(updateProjectSchema.extend({ workspaceId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id, workspaceId: _wid, ...data } = input;
      return ctx.db.project.update({ where: { id, workspaceId: ctx.workspaceId }, data });
    }),

  archive: workspaceProcedure
    .input(z.object({ workspaceId: z.string().cuid(), projectId: z.string().cuid() }))
    .mutation(({ ctx, input }) =>
      ctx.db.project.update({
        where: { id: input.projectId, workspaceId: ctx.workspaceId },
        data: { status: "ARCHIVED" },
      }),
    ),

  delete: workspaceProcedure
    .input(z.object({ workspaceId: z.string().cuid(), projectId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.member.role !== "OWNER" && ctx.member.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return ctx.db.project.delete({
        where: { id: input.projectId, workspaceId: ctx.workspaceId },
      });
    }),
});
