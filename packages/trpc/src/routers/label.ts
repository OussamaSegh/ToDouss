import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createLabelSchema, updateLabelSchema } from "@todouss/validators";
import { createTRPCRouter, workspaceProcedure } from "../trpc";

export const labelRouter = createTRPCRouter({
  list: workspaceProcedure
    .input(z.object({ workspaceId: z.string().cuid() }))
    .query(({ ctx }) =>
      ctx.db.label.findMany({
        where: { workspaceId: ctx.workspaceId },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
    ),

  create: workspaceProcedure.input(createLabelSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.label.findUnique({
      where: { workspaceId_name: { workspaceId: ctx.workspaceId, name: input.name } },
    });
    if (existing) {
      throw new TRPCError({ code: "CONFLICT", message: "Label with this name already exists" });
    }

    const maxOrder = await ctx.db.label.findFirst({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    return ctx.db.label.create({
      data: {
        workspaceId: ctx.workspaceId,
        name: input.name,
        color: input.color,
        sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      },
    });
  }),

  update: workspaceProcedure
    .input(updateLabelSchema.extend({ workspaceId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id, workspaceId: _wid, ...data } = input;
      const existing = await ctx.db.label.findUnique({ where: { id } });
      if (!existing || existing.workspaceId !== ctx.workspaceId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return ctx.db.label.update({ where: { id }, data });
    }),

  delete: workspaceProcedure
    .input(z.object({ workspaceId: z.string().cuid(), labelId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.label.findUnique({ where: { id: input.labelId } });
      if (!existing || existing.workspaceId !== ctx.workspaceId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return ctx.db.label.delete({ where: { id: input.labelId } });
    }),
});
