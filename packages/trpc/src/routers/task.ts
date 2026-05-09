import { TRPCError } from "@trpc/server";
import { Prisma } from "@todouss/db";
import { z } from "zod";
import {
  createTaskSchema,
  updateTaskSchema,
  reorderTaskSchema,
  taskFilterSchema,
  taskRangeSchema,
} from "@todouss/validators";
import { createTRPCRouter, workspaceProcedure } from "../trpc";
import { ensureDbUser } from "../lib/ensure-db-user";
import { parseMentionUserIdsFromBody } from "../lib/mentions";
import {
  assertProjectIdAccessible,
  assertTaskProjectAccess,
  mergeTaskProjectScope,
} from "../lib/task-project-scope";
import { dispatchWorkspaceWebhooks } from "../lib/dispatch-workspace-webhook";
import {
  buildRecurrenceTaskPayload,
  createNextRecurringInstance,
  parseRecurrenceRule,
} from "../lib/recurrence";

function buildDatePresetRange(preset: string) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  if (preset === "TODAY") {
    end.setDate(end.getDate() + 1);
    return { gte: start, lt: end };
  }
  if (preset === "TOMORROW") {
    const t = new Date(start);
    t.setDate(t.getDate() + 1);
    const t2 = new Date(t);
    t2.setDate(t2.getDate() + 1);
    return { gte: t, lt: t2 };
  }
  if (preset === "THIS_WEEK") {
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 7);
    return { gte: start, lt: end };
  }
  if (preset === "NEXT_7_DAYS") {
    end.setDate(end.getDate() + 7);
    return { gte: start, lt: end };
  }
  if (preset === "NEXT_30_DAYS") {
    end.setDate(end.getDate() + 30);
    return { gte: start, lt: end };
  }
  if (preset === "OVERDUE") {
    return { lt: start };
  }
  return null;
}

export const taskRouter = createTRPCRouter({
  list: workspaceProcedure.input(taskFilterSchema).query(async ({ ctx, input }) => {
    const presetRange = input.datePreset ? buildDatePresetRange(input.datePreset) : null;
    const where: Prisma.TaskWhereInput = {
      workspaceId: ctx.workspaceId,
      isArchived: input.isArchived,
    };
    await mergeTaskProjectScope(
      ctx.db,
      ctx.workspaceId,
      ctx.member.userId,
      ctx.member.role,
      input.projectId,
      where,
    );
    if (input.priority?.length) where.priority = { in: input.priority };
    if (input.assigneeId?.length) where.assigneeId = { in: input.assigneeId };
    if (input.labelIds?.length) where.labels = { some: { labelId: { in: input.labelIds } } };
    if (input.isRecurring !== undefined) where.isRecurring = input.isRecurring;
    if (input.dueBefore || input.dueAfter) {
      where.dueDate = {
        ...(input.dueBefore ? { lte: input.dueBefore } : {}),
        ...(input.dueAfter ? { gte: input.dueAfter } : {}),
      };
    }
    if (input.startDateFrom || input.startDateTo) {
      where.startDate = {
        ...(input.startDateFrom ? { gte: input.startDateFrom } : {}),
        ...(input.startDateTo ? { lte: input.startDateTo } : {}),
      };
    }
    if (presetRange) where.dueDate = presetRange;
    if (input.datePreset === "NO_DATE") where.dueDate = null;

    const searchTerm = input.search?.trim();
    const needsStatusAnd =
      Boolean(input.status?.length) ||
      Boolean(!input.includeCompleted) ||
      Boolean(searchTerm);

    if (needsStatusAnd) {
      const closedStatuses = ["DONE", "CANCELLED"] as const;
      const andParts: Prisma.TaskWhereInput[] = [
        ...(input.status?.length ? [{ status: { in: input.status } }] : []),
        ...(!input.includeCompleted ? [{ status: { notIn: [...closedStatuses] } }] : []),
        ...(searchTerm
          ? [
              {
                OR: [
                  { title: { contains: searchTerm, mode: "insensitive" as const } },
                  { description: { contains: searchTerm, mode: "insensitive" as const } },
                  {
                    comments: {
                      some: {
                        body: { contains: searchTerm, mode: "insensitive" as const },
                      },
                    },
                  },
                ],
              },
            ]
          : []),
      ];
      if (andParts.length) where.AND = andParts;
    }

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
            include: {
              author: { select: { id: true, name: true, avatarUrl: true } },
              mentions: {
                include: { user: { select: { id: true, name: true, avatarUrl: true } } },
              },
              reactions: true,
            },
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
      await assertTaskProjectAccess(
        ctx.db,
        ctx.workspaceId,
        ctx.member.userId,
        ctx.member.role,
        task.projectId,
      );
      return task;
    }),

  create: workspaceProcedure.input(createTaskSchema).mutation(async ({ ctx, input }) => {
    const dbUser = await ensureDbUser(ctx);
    await assertProjectIdAccessible(
      ctx.db,
      ctx.workspaceId,
      ctx.member.userId,
      ctx.member.role,
      input.projectId,
    );

    const maxOrder = await ctx.db.task.findFirst({
      where: { workspaceId: ctx.workspaceId, projectId: input.projectId ?? null },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const mentionIds = input.description
      ? parseMentionUserIdsFromBody(input.description).filter((id) => id !== dbUser.id)
      : [];
    const mentionUsers = mentionIds.length
      ? await ctx.db.workspaceMember.findMany({
          where: { workspaceId: ctx.workspaceId, userId: { in: mentionIds } },
          select: { userId: true },
        })
      : [];
    const mentionUserIds = [...new Set(mentionUsers.map((m) => m.userId))];

    const task = await ctx.db.$transaction(async (tx) => {
      const created = await tx.task.create({
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
          ...buildRecurrenceTaskPayload({
            isRecurring: input.isRecurring,
            recurrenceRule: input.recurrenceRule,
          }),
          labels: input.labelIds?.length
            ? { create: input.labelIds.map((labelId) => ({ labelId })) }
            : undefined,
          mentions: mentionUserIds.length
            ? {
                createMany: {
                  data: mentionUserIds.map((userId) => ({ userId })),
                  skipDuplicates: true,
                },
              }
            : undefined,
        },
        include: {
          labels: { include: { label: true } },
          assignee: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      if (mentionUserIds.length) {
        await tx.notification.createMany({
          data: mentionUserIds.map((userId) => ({
            userId,
            type: "MENTION",
            title: `${dbUser.name ?? "Someone"} mentioned you`,
            body: `In task: ${created.title}`,
            meta: {
              workspaceId: ctx.workspaceId,
              taskId: created.id,
            } satisfies Prisma.InputJsonValue,
          })),
          skipDuplicates: true,
        });
      }
      return created;
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
      const dbUser = await ensureDbUser(ctx);

      const existing = await ctx.db.task.findUnique({
        where: { id: input.id, workspaceId: ctx.workspaceId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      await assertTaskProjectAccess(
        ctx.db,
        ctx.workspaceId,
        ctx.member.userId,
        ctx.member.role,
        existing.projectId,
      );
      if (input.projectId !== undefined) {
        await assertProjectIdAccessible(
          ctx.db,
          ctx.workspaceId,
          ctx.member.userId,
          ctx.member.role,
          input.projectId,
        );
      }

      const { id, workspaceId: _wid, labelIds, recurrenceRule, ...data } = input;

      const mentionIds = data.description
        ? parseMentionUserIdsFromBody(data.description).filter((uid) => uid !== dbUser.id)
        : [];
      const mentionUsers = mentionIds.length
        ? await ctx.db.workspaceMember.findMany({
            where: { workspaceId: ctx.workspaceId, userId: { in: mentionIds } },
            select: { userId: true },
          })
        : [];
      const mentionUserIds = [...new Set(mentionUsers.map((m) => m.userId))];

      const task = await ctx.db.$transaction(async (tx) => {
        const updated = await tx.task.update({
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
            ...(data.description !== undefined
              ? {
                  mentions: {
                    deleteMany: { commentId: null },
                    ...(mentionUserIds.length
                      ? {
                          createMany: {
                            data: mentionUserIds.map((userId) => ({ userId })),
                            skipDuplicates: true,
                          },
                        }
                      : {}),
                  },
                }
              : {}),
            ...buildRecurrenceTaskPayload({
              isRecurring: data.isRecurring,
              recurrenceRule: recurrenceRule ?? undefined,
              currentParentId: existing.recurrenceParentId,
            }),
          },
          include: {
            labels: { include: { label: true } },
            assignee: { select: { id: true, name: true, avatarUrl: true } },
          },
        });

        if (data.description !== undefined && mentionUserIds.length) {
          await tx.notification.createMany({
            data: mentionUserIds.map((userId) => ({
              userId,
              type: "MENTION",
              title: `${dbUser.name ?? "Someone"} mentioned you`,
              body: `In task: ${updated.title}`,
              meta: {
                workspaceId: ctx.workspaceId,
                taskId: updated.id,
              } satisfies Prisma.InputJsonValue,
            })),
            skipDuplicates: true,
          });
        }
        return updated;
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

      if (data.status === "DONE" && existing.status !== "DONE") {
        await dispatchWorkspaceWebhooks(ctx.db, ctx.workspaceId, "task.completed", {
          taskId: id,
          title: task.title,
          projectId: task.projectId,
        });
      }

      return task;
    },
  ),

  reorder: workspaceProcedure.input(reorderTaskSchema.extend({ workspaceId: z.string().cuid() })).mutation(
    async ({ ctx, input }) => {
      const t = await ctx.db.task.findUnique({
        where: { id: input.taskId, workspaceId: ctx.workspaceId },
        select: { projectId: true },
      });
      if (!t) throw new TRPCError({ code: "NOT_FOUND" });
      await assertTaskProjectAccess(
        ctx.db,
        ctx.workspaceId,
        ctx.member.userId,
        ctx.member.role,
        t.projectId,
      );
      if (input.newProjectId !== undefined) {
        await assertProjectIdAccessible(
          ctx.db,
          ctx.workspaceId,
          ctx.member.userId,
          ctx.member.role,
          input.newProjectId,
        );
      }
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
    .mutation(async ({ ctx, input }) => {
      const t = await ctx.db.task.findUnique({
        where: { id: input.taskId, workspaceId: ctx.workspaceId },
        select: { projectId: true },
      });
      if (!t) throw new TRPCError({ code: "NOT_FOUND" });
      await assertTaskProjectAccess(
        ctx.db,
        ctx.workspaceId,
        ctx.member.userId,
        ctx.member.role,
        t.projectId,
      );
      return ctx.db.task.delete({ where: { id: input.taskId, workspaceId: ctx.workspaceId } });
    }),

  today: workspaceProcedure
    .input(z.object({ workspaceId: z.string().cuid() }))
    .query(async ({ ctx }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const where: Prisma.TaskWhereInput = {
        workspaceId: ctx.workspaceId,
        isArchived: false,
        status: { notIn: ["DONE", "CANCELLED"] },
        OR: [
          { dueDate: { gte: today, lt: tomorrow } },
          { dueDate: { lt: today } },
        ],
      };
      await mergeTaskProjectScope(
        ctx.db,
        ctx.workspaceId,
        ctx.member.userId,
        ctx.member.role,
        undefined,
        where,
      );

      return ctx.db.task.findMany({
        where,
        include: {
          labels: { include: { label: true } },
          assignee: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: [{ priority: "asc" }, { sortOrder: "asc" }],
      });
    }),

  upcoming: workspaceProcedure
    .input(z.object({ workspaceId: z.string().cuid(), days: z.number().default(7) }))
    .query(async ({ ctx, input }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const future = new Date(today);
      future.setDate(future.getDate() + input.days);

      const where: Prisma.TaskWhereInput = {
        workspaceId: ctx.workspaceId,
        isArchived: false,
        status: { notIn: ["DONE", "CANCELLED"] },
        dueDate: { gte: today, lte: future },
      };
      await mergeTaskProjectScope(
        ctx.db,
        ctx.workspaceId,
        ctx.member.userId,
        ctx.member.role,
        undefined,
        where,
      );

      return ctx.db.task.findMany({
        where,
        include: {
          labels: { include: { label: true } },
          assignee: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: [{ dueDate: "asc" }, { priority: "asc" }],
      });
    }),

  calendarRange: workspaceProcedure.input(taskRangeSchema).query(async ({ ctx, input }) => {
    const rangeOverlap: Prisma.TaskWhereInput = {
      OR: [
        { startDate: { gte: input.from, lte: input.to } },
        { dueDate: { gte: input.from, lte: input.to } },
        {
          AND: [
            { startDate: { lte: input.from } },
            { dueDate: { gte: input.to } },
          ],
        },
      ],
    };

    const where: Prisma.TaskWhereInput = {
      workspaceId: ctx.workspaceId,
      parentTaskId: null,
      ...(input.includeArchived ? {} : { isArchived: false }),
      ...(input.includeCompleted ? {} : { status: { notIn: ["DONE", "CANCELLED"] } }),
      AND: [rangeOverlap],
      ...(input.labelIds?.length ? { labels: { some: { labelId: { in: input.labelIds } } } } : {}),
      ...(input.assigneeId?.length ? { assigneeId: { in: input.assigneeId } } : {}),
      ...(input.status?.length ? { status: { in: input.status } } : {}),
      ...(input.priority?.length ? { priority: { in: input.priority } } : {}),
    };
    await mergeTaskProjectScope(
      ctx.db,
      ctx.workspaceId,
      ctx.member.userId,
      ctx.member.role,
      input.projectId,
      where,
    );
    return ctx.db.task.findMany({
      where,
      include: {
        labels: { include: { label: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        project: { select: { id: true, name: true, color: true } },
        _count: { select: { comments: true, subtasks: true, attachments: true } },
      },
      orderBy: [{ startDate: "asc" }, { dueDate: "asc" }, { sortOrder: "asc" }],
    });
  }),

  timelineRange: workspaceProcedure.input(taskRangeSchema).query(async ({ ctx, input }) => {
    const where: Prisma.TaskWhereInput = {
      workspaceId: ctx.workspaceId,
      ...(input.includeArchived ? {} : { isArchived: false }),
      ...(input.includeCompleted ? {} : { status: { notIn: ["DONE", "CANCELLED"] } }),
      OR: [
        { startDate: { gte: input.from, lte: input.to } },
        { dueDate: { gte: input.from, lte: input.to } },
        {
          AND: [
            { startDate: { lte: input.from } },
            { dueDate: { gte: input.to } },
          ],
        },
      ],
      ...(input.labelIds?.length ? { labels: { some: { labelId: { in: input.labelIds } } } } : {}),
      ...(input.assigneeId?.length ? { assigneeId: { in: input.assigneeId } } : {}),
      ...(input.status?.length ? { status: { in: input.status } } : {}),
      ...(input.priority?.length ? { priority: { in: input.priority } } : {}),
    };
    await mergeTaskProjectScope(
      ctx.db,
      ctx.workspaceId,
      ctx.member.userId,
      ctx.member.role,
      input.projectId,
      where,
    );
    return ctx.db.task.findMany({
      where,
      include: {
        labels: { include: { label: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { comments: true, subtasks: true, attachments: true } },
      },
      orderBy: [{ startDate: "asc" }, { dueDate: "asc" }, { sortOrder: "asc" }],
    });
  }),

  tableList: workspaceProcedure.input(taskFilterSchema).query(async ({ ctx, input }) => {
    const where: Prisma.TaskWhereInput = {
      workspaceId: ctx.workspaceId,
      isArchived: input.isArchived,
    };
    await mergeTaskProjectScope(
      ctx.db,
      ctx.workspaceId,
      ctx.member.userId,
      ctx.member.role,
      input.projectId,
      where,
    );
    const base = await ctx.db.task.findMany({
      where,
      include: {
        labels: { include: { label: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { comments: true, subtasks: true, attachments: true } },
      },
      orderBy: [{ dueDate: "asc" }, { priority: "asc" }, { sortOrder: "asc" }],
      take: input.limit,
    });
    return base;
  }),

  generateNextRecurring: workspaceProcedure
    .input(z.object({ workspaceId: z.string().cuid(), taskId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.db.task.findUnique({
        where: { id: input.taskId, workspaceId: ctx.workspaceId },
      });
      if (!source) throw new TRPCError({ code: "NOT_FOUND" });
      await assertTaskProjectAccess(
        ctx.db,
        ctx.workspaceId,
        ctx.member.userId,
        ctx.member.role,
        source.projectId,
      );
      if (!source.isRecurring || !source.recurrenceRule) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Task is not recurring" });
      }

      const normalized = parseRecurrenceRule(source.recurrenceRule);
      if (!normalized) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid recurrence rule" });

      const next = createNextRecurringInstance(source, normalized);
      if (!next) return null;

      const existing = await ctx.db.task.findFirst({
        where: {
          workspaceId: ctx.workspaceId,
          recurrenceParentId: source.id,
          dueDate: next.dueDate,
        },
      });
      if (existing) return existing;

      return ctx.db.task.create({
        data: {
          workspaceId: ctx.workspaceId,
          projectId: source.projectId,
          sectionId: source.sectionId,
          parentTaskId: null,
          creatorId: source.creatorId,
          assigneeId: source.assigneeId,
          title: source.title,
          description: source.description,
          status: "TODO",
          priority: source.priority,
          dueDate: next.dueDate,
          dueTime: source.dueTime,
          startDate: next.startDate,
          sortOrder: source.sortOrder + 0.001,
          boardOrder: source.boardOrder + 0.001,
          isRecurring: false,
          recurrenceParentId: source.id,
          labels: {
            create: (
              await ctx.db.taskLabel.findMany({ where: { taskId: source.id }, select: { labelId: true } })
            ).map((l) => ({ labelId: l.labelId })),
          },
        },
      });
    }),
});
