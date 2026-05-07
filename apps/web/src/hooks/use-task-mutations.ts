"use client";

import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { trpc } from "@/lib/trpc/provider";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@todouss/trpc";

type RouterOutput = inferRouterOutputs<AppRouter>;
type TaskListOutput = RouterOutput["task"]["list"];
type TaskListItem = TaskListOutput["tasks"][number];
type TaskGetOutput = RouterOutput["task"]["get"];
type TodayOutput = RouterOutput["task"]["today"];
type UpcomingOutput = RouterOutput["task"]["upcoming"];

// ---------------------------------------------------------------------------
// Cache patch helpers — operate over ALL cached variations of task.list /
// task.today / task.upcoming for a workspace (independent of input).
// ---------------------------------------------------------------------------

interface ListSnapshot {
  listEntries: Array<[readonly unknown[], TaskListOutput | undefined]>;
  todayEntries: Array<[readonly unknown[], TodayOutput | undefined]>;
  upcomingEntries: Array<[readonly unknown[], UpcomingOutput | undefined]>;
}

function snapshotAndPatchLists(
  queryClient: ReturnType<typeof useQueryClient>,
  patcher: (task: TaskListItem) => TaskListItem | null,
): ListSnapshot {
  const listKey = getQueryKey(trpc.task.list);
  const todayKey = getQueryKey(trpc.task.today);
  const upcomingKey = getQueryKey(trpc.task.upcoming);

  const listEntries = queryClient.getQueriesData<TaskListOutput>({ queryKey: listKey });
  const todayEntries = queryClient.getQueriesData<TodayOutput>({ queryKey: todayKey });
  const upcomingEntries = queryClient.getQueriesData<UpcomingOutput>({ queryKey: upcomingKey });

  for (const [key, data] of listEntries) {
    if (!data) continue;
    const next = data.tasks
      .map((t) => patcher(t))
      .filter((t): t is TaskListItem => t !== null);
    queryClient.setQueryData<TaskListOutput>(key, { ...data, tasks: next });
  }
  for (const [key, data] of todayEntries) {
    if (!data) continue;
    const next = data
      .map((t) => patcher(t as TaskListItem) as unknown as TodayOutput[number] | null)
      .filter((t): t is TodayOutput[number] => t !== null);
    queryClient.setQueryData<TodayOutput>(key, next);
  }
  for (const [key, data] of upcomingEntries) {
    if (!data) continue;
    const next = data
      .map((t) => patcher(t as TaskListItem) as unknown as UpcomingOutput[number] | null)
      .filter((t): t is UpcomingOutput[number] => t !== null);
    queryClient.setQueryData<UpcomingOutput>(key, next);
  }

  return { listEntries, todayEntries, upcomingEntries };
}

function rollbackLists(
  queryClient: ReturnType<typeof useQueryClient>,
  snap: ListSnapshot,
) {
  for (const [key, data] of snap.listEntries) {
    queryClient.setQueryData(key, data);
  }
  for (const [key, data] of snap.todayEntries) {
    queryClient.setQueryData(key, data);
  }
  for (const [key, data] of snap.upcomingEntries) {
    queryClient.setQueryData(key, data);
  }
}

// ---------------------------------------------------------------------------
// useCreateTask
// ---------------------------------------------------------------------------
export function useCreateTask() {
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();

  return trpc.task.create.useMutation({
    onMutate: async (input) => {
      await utils.task.list.cancel({ workspaceId: input.workspaceId });

      const optimisticTask: TaskListItem = {
        id: `optimistic-${Date.now()}`,
        workspaceId: input.workspaceId,
        projectId: input.projectId ?? null,
        sectionId: input.sectionId ?? null,
        parentTaskId: input.parentTaskId ?? null,
        creatorId: "",
        assigneeId: input.assigneeId ?? null,
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? "TODO",
        priority: input.priority ?? "P4",
        dueDate: input.dueDate ?? null,
        dueTime: input.dueTime ?? false,
        startDate: input.startDate ?? null,
        sortOrder: Date.now(),
        boardOrder: 0,
        completedAt: null,
        isArchived: false,
        isRecurring: false,
        recurrenceRule: null,
        recurrenceParentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        labels: [],
        assignee: null,
        _count: { subtasks: 0, comments: 0, attachments: 0 },
      };

      // Snapshot all task.list entries
      const listKey = getQueryKey(trpc.task.list);
      const listEntries = queryClient.getQueriesData<TaskListOutput>({ queryKey: listKey });

      // Insert into matching list caches (subtasks only into parent's projectId list)
      for (const [key, data] of listEntries) {
        if (!data) continue;
        // The query input is the second element of key tuple; safe to narrow.
        const queryInput = (key as ReadonlyArray<unknown>)[1] as
          | { input?: { workspaceId?: string; projectId?: string } }
          | undefined;
        const inputData = queryInput?.input;
        if (!inputData || inputData.workspaceId !== input.workspaceId) continue;
        if (inputData.projectId && inputData.projectId !== optimisticTask.projectId) continue;
        // Don't pollute filtered lists with subtasks
        if (optimisticTask.parentTaskId) continue;
        queryClient.setQueryData<TaskListOutput>(key, {
          ...data,
          tasks: [optimisticTask, ...data.tasks],
        });
      }

      return { listEntries };
    },

    onError: (_err, _input, ctx) => {
      if (!ctx) return;
      for (const [key, data] of ctx.listEntries) {
        queryClient.setQueryData(key, data);
      }
    },

    onSettled: (_data, _err, input) => {
      void utils.task.list.invalidate({ workspaceId: input.workspaceId });
      void utils.task.today.invalidate({ workspaceId: input.workspaceId });
      void utils.task.upcoming.invalidate({ workspaceId: input.workspaceId });
      if (input.parentTaskId) {
        void utils.task.get.invalidate({
          workspaceId: input.workspaceId,
          taskId: input.parentTaskId,
        });
      }
    },
  });
}

// ---------------------------------------------------------------------------
// useUpdateTask
// ---------------------------------------------------------------------------
export function useUpdateTask() {
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();

  return trpc.task.update.useMutation({
    onMutate: async (input) => {
      await utils.task.list.cancel({ workspaceId: input.workspaceId });
      await utils.task.get.cancel({ workspaceId: input.workspaceId, taskId: input.id });

      // Snapshot detail cache
      const detailSnapshot = utils.task.get.getData({
        workspaceId: input.workspaceId,
        taskId: input.id,
      });

      // Patch detail
      if (detailSnapshot) {
        const patched: TaskGetOutput = {
          ...detailSnapshot,
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
          ...(input.completedAt !== undefined ? {} : {}),
          updatedAt: new Date(),
        };
        utils.task.get.setData(
          { workspaceId: input.workspaceId, taskId: input.id },
          patched,
        );
      }

      // Patch all list / today / upcoming caches
      const listSnap = snapshotAndPatchLists(queryClient, (task) => {
        if (task.id !== input.id) return task;
        return {
          ...task,
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
          ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
          ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
          ...(input.sectionId !== undefined ? { sectionId: input.sectionId } : {}),
          ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
          ...(input.boardOrder !== undefined ? { boardOrder: input.boardOrder } : {}),
          updatedAt: new Date(),
        };
      });

      return { detailSnapshot, listSnap };
    },

    onError: (_err, input, ctx) => {
      if (ctx?.detailSnapshot) {
        utils.task.get.setData(
          { workspaceId: input.workspaceId, taskId: input.id },
          ctx.detailSnapshot,
        );
      }
      if (ctx?.listSnap) rollbackLists(queryClient, ctx.listSnap);
    },

    onSettled: (_data, _err, input) => {
      void utils.task.list.invalidate({ workspaceId: input.workspaceId });
      void utils.task.get.invalidate({ workspaceId: input.workspaceId, taskId: input.id });
      void utils.task.today.invalidate({ workspaceId: input.workspaceId });
      void utils.task.upcoming.invalidate({ workspaceId: input.workspaceId });
    },
  });
}

// ---------------------------------------------------------------------------
// useDeleteTask
// ---------------------------------------------------------------------------
export function useDeleteTask() {
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();

  return trpc.task.delete.useMutation({
    onMutate: async (input) => {
      await utils.task.list.cancel({ workspaceId: input.workspaceId });

      const listSnap = snapshotAndPatchLists(queryClient, (task) =>
        task.id === input.taskId ? null : task,
      );

      return { listSnap };
    },

    onError: (_err, _input, ctx) => {
      if (ctx?.listSnap) rollbackLists(queryClient, ctx.listSnap);
    },

    onSettled: (_data, _err, input) => {
      void utils.task.list.invalidate({ workspaceId: input.workspaceId });
      void utils.task.today.invalidate({ workspaceId: input.workspaceId });
      void utils.task.upcoming.invalidate({ workspaceId: input.workspaceId });
    },
  });
}

// ---------------------------------------------------------------------------
// useReorderTask
// ---------------------------------------------------------------------------
export function useReorderTask() {
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();

  return trpc.task.reorder.useMutation({
    onMutate: async (input) => {
      const wid = (input as { workspaceId?: string }).workspaceId;
      if (wid) await utils.task.list.cancel({ workspaceId: wid });

      // Patch caches with the new sortOrder/boardOrder + status, then re-sort by sortOrder
      const listSnap = snapshotAndPatchLists(queryClient, (task) => {
        if (task.id !== input.taskId) return task;
        return {
          ...task,
          sortOrder: input.newSortOrder,
          ...(input.newBoardOrder !== undefined ? { boardOrder: input.newBoardOrder } : {}),
          ...(input.newStatus !== undefined ? { status: input.newStatus } : {}),
          ...(input.newProjectId !== undefined ? { projectId: input.newProjectId } : {}),
          ...(input.newSectionId !== undefined ? { sectionId: input.newSectionId } : {}),
          updatedAt: new Date(),
        };
      });

      // Re-sort each affected list cache by sortOrder so the moved item lands in place
      const listKey = getQueryKey(trpc.task.list);
      const listEntries = queryClient.getQueriesData<TaskListOutput>({ queryKey: listKey });
      for (const [key, data] of listEntries) {
        if (!data) continue;
        const sorted = [...data.tasks].sort((a, b) => a.sortOrder - b.sortOrder);
        queryClient.setQueryData<TaskListOutput>(key, { ...data, tasks: sorted });
      }

      return { listSnap };
    },

    onError: (_err, _input, ctx) => {
      if (ctx?.listSnap) rollbackLists(queryClient, ctx.listSnap);
    },

    onSettled: (_data, _err, input) => {
      const wid = (input as { workspaceId?: string }).workspaceId;
      if (wid) {
        void utils.task.list.invalidate({ workspaceId: wid });
        void utils.task.today.invalidate({ workspaceId: wid });
        void utils.task.upcoming.invalidate({ workspaceId: wid });
      } else {
        void utils.task.list.invalidate();
      }
    },
  });
}
