import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createTaskSchema,
  updateTaskSchema,
  reorderTaskSchema,
  taskFilterSchema,
} from "@todouss/validators";
import { createTRPCRouter, workspaceProcedure } from "../trpc";

export const taskRouter = createTRPCRouter({
  list: workspaceProcedure.input(taskFilterSchema).query(async ({ ctx, input }) => {
    const where = {
      workspaceId: ctx.workspaceId,
      isArchived: input.isArchived,
      ...(input.projectId ? { projectId: input.projectId } : {}),
      ...(input.status?.length ? { status: { in: input.status } } : {}),
      ...(input.priority?.length ? { priority: { in: input.priority } } : {}),
      ...(input.assigneeId?.length ? { assigneeId: { in: input.assigneeId } } : {}),
      ...(input.dueBefore || input.dueAfter
        ? {
            dueDate: {
              ...(input.dueBefore ? { lte: input.dueBefore } : {}),
              ...(input.dueAfter ? { gte: input.dueAfter } : {}),
            },
          }
        : {}),
      ...(input.search ? { title: { contains: input.search, mode: "insensitive" as const } } : {}),
    };

    const tasks = await ctx.db.task.findMany({
      where,
      include: {
        labels: { include: { label: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { subtasks: true, comments: true, attachments: true } },
      },
      orderBy: { sortOrder: "asc" },
      take: input.limit + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    });

    const hasNextPage = tasks.length > input.limit;
    if (hasNextPage) tasks.pop();

    return {
      tasks,
      nextCursor: hasNextPage ? tasks[tasks.length - 1]?.id : undefined,
    };
  }),

  get: workspaceProcedure
    .input(z.object({ workspaceId: z.string().cuid(), taskId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const task = await ctx.db.task.findUnique({
        where: { id: input.taskId, workspaceId: ctx.workspaceId },
        include: {
          labels: { include: { label: true } },
          assignee: { select: { id: true, name: true, avatarUrl: true } },
          creator: { select: { id: true, name: true, avatarUrl: true } },
          subtasks: {
            orderBy: { sortOrder: "asc" },
            include: { assignee: { select: { id: true, name: true, avatarUrl: true } } },
          },
          comments: {
            orderBy: { createdAt: "asc" },
            include: { author: { select: { id: true, name: true, avatarUrl: true } } },
          },
          activities: {
            orderBy: { createdAt: "desc" },
            take: 20,
            include: { actor: { select: { id: true, name: true, avatarUrl: true } } },
          },
          attachments: true,
        },
      });

      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      return task;
    }),

  create: workspaceProcedure.input(createTaskSchema).mutation(async ({ ctx, input }) => {
    const dbUser = await ctx.db.user.findUnique({ where: { clerkId: ctx.userId } });
    if (!dbUser) throw new TRPCError({ code: "NOT_FOUND" });

    const maxOrder = await ctx.db.task.findFirst({
      where: { workspaceId: ctx.workspaceId, projectId: input.projectId ?? null },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const task = await ctx.db.task.create({
      data: {
        workspaceId: ctx.workspaceId,
        projectId: input.projectId,
        sectionId: input.sectionId,
        parentTaskId: input.parentTaskId,
        creatorId: dbUser.id,
        assigneeId: input.assigneeId,
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        dueDate: input.dueDate,
        dueTime: input.dueTime,
        startDate: input.startDate,
        sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
        labels: input.labelIds?.length
          ? { create: input.labelIds.map((labelId) => ({ labelId })) }
          : undefined,
      },
      include: {
        labels: { include: { label: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    await ctx.db.activityLog.create({
      data: {
        taskId: task.id,
        actorId: dbUser.id,
        type: "TASK_CREATED",
        meta: {},
      },
    });

    return task;
  }),

  update: workspaceProcedure.input(updateTaskSchema.extend({ workspaceId: z.string().cuid() })).mutation(
    async ({ ctx, input }) => {
      const dbUser = await ctx.db.user.findUnique({ where: { clerkId: ctx.userId } });
      if (!dbUser) throw new TRPCError({ code: "NOT_FOUND" });

      const existing = await ctx.db.task.findUnique({
        where: { id: input.id, workspaceId: ctx.workspaceId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const { id, workspaceId: _wid, labelIds, ...data } = input;

      const task = await ctx.db.task.update({
        where: { id, workspaceId: ctx.workspaceId },
        data: {
          ...data,
          completedAt:
            data.status === "DONE" && existing.status !== "DONE"
              ? new Date()
              : data.status && data.status !== "DONE"
                ? null
                : undefined,
          ...(labelIds !== undefined
            ? {
                labels: {
                  deleteMany: {},
                  create: labelIds.map((labelId) => ({ labelId })),
                },
              }
            : {}),
        },
        include: {
          labels: { include: { label: true } },
          assignee: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      if (data.status && data.status !== existing.status) {
        await ctx.db.activityLog.create({
          data: {
            taskId: id,
            actorId: dbUser.id,
            type: "TASK_STATUS_CHANGED",
            meta: { oldValue: existing.status, newValue: data.status },
          },
        });
      }

      return task;
    },
  ),

  reorder: workspaceProcedure.input(reorderTaskSchema.extend({ workspaceId: z.string().cuid() })).mutation(
    async ({ ctx, input }) => {
      return ctx.db.task.update({
        where: { id: input.taskId, workspaceId: ctx.workspaceId },
        data: {
          sortOrder: input.newSortOrder,
          boardOrder: input.newBoardOrder,
          projectId: input.newProjectId,
          sectionId: input.newSectionId,
          status: input.newStatus,
        },
      });
    },
  ),

  delete: workspaceProcedure
    .input(z.object({ workspaceId: z.string().cuid(), taskId: z.string().cuid() }))
    .mutation(({ ctx, input }) =>
      ctx.db.task.delete({ where: { id: input.taskId, workspaceId: ctx.workspaceId } }),
    ),

  today: workspaceProcedure
    .input(z.object({ workspaceId: z.string().cuid() }))
    .query(({ ctx }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return ctx.db.task.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          isArchived: false,
          status: { notIn: ["DONE", "CANCELLED"] },
          OR: [
            { dueDate: { gte: today, lt: tomorrow } },
            { dueDate: { lt: today } },
          ],
        },
        include: {
          labels: { include: { label: true } },
          assignee: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: [{ priority: "asc" }, { sortOrder: "asc" }],
      });
    }),

  upcoming: workspaceProcedure
    .input(z.object({ workspaceId: z.string().cuid(), days: z.number().default(7) }))
    .query(({ ctx, input }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const future = new Date(today);
      future.setDate(future.getDate() + input.days);

      return ctx.db.task.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          isArchived: false,
          status: { notIn: ["DONE", "CANCELLED"] },
          dueDate: { gte: today, lte: future },
        },
        include: {
          labels: { include: { label: true } },
          assignee: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: [{ dueDate: "asc" }, { priority: "asc" }],
      });
    }),
});
