"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@todouss/ui";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { trpc } from "@/lib/trpc/provider";
import { useWorkspace } from "@/lib/workspace-context";
import { useReorderTask } from "@/hooks/use-task-mutations";
import { TaskItem } from "./task-item";
import { QuickAdd } from "./quick-add";
import { Plus, ChevronDown } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@todouss/trpc";
import type { AdvancedTaskFilters } from "@/components/tasks/advanced-filter-toolbar";
import { trpcFiltersFromAdvanced } from "@/lib/task-filters";

type RouterOutput = inferRouterOutputs<AppRouter>;
type TaskListItem = RouterOutput["task"]["list"]["tasks"][number];

export type TaskFilter = "inbox" | "today" | "upcoming" | "project";
export type GroupBy = "none" | "status" | "priority";

const STATUS_GROUPS: { key: string; label: string }[] = [
  { key: "INBOX", label: "Inbox" },
  { key: "TODO", label: "To Do" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "IN_REVIEW", label: "In Review" },
  { key: "DONE", label: "Done" },
  { key: "CANCELLED", label: "Cancelled" },
];

const PRIORITY_GROUPS: { key: string; label: string }[] = [
  { key: "P1", label: "Priority 1 — Urgent" },
  { key: "P2", label: "Priority 2 — High" },
  { key: "P3", label: "Priority 3 — Medium" },
  { key: "P4", label: "Priority 4 — Low" },
];

interface TaskListProps {
  filter: TaskFilter;
  projectId?: string;
  groupBy?: GroupBy;
  className?: string;
  advancedFilters?: AdvancedTaskFilters;
}

function SortableTaskItem({
  task,
  workspaceId,
}: {
  task: TaskListItem;
  workspaceId: string;
}) {
  const {
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskItem task={task} workspaceId={workspaceId} />
    </div>
  );
}

function TaskSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
      <div className="h-4 w-4 rounded-full bg-muted shrink-0" />
      <div className="h-4 flex-1 rounded bg-muted" />
      <div className="h-4 w-16 rounded bg-muted" />
    </div>
  );
}

export function TaskList({
  filter,
  projectId,
  groupBy = "none",
  className,
  advancedFilters,
}: TaskListProps) {
  const workspace = useWorkspace();
  const adv = advancedFilters ?? {
    assigneeId: [],
    labelIds: [],
    status: [],
    priority: [],
  };
  const advQ = trpcFiltersFromAdvanced(adv);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const reorderTask = useReorderTask();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const listQuery = trpc.task.list.useQuery(
    {
      workspaceId: workspace.id,
      ...(projectId ? { projectId } : {}),
      ...(filter === "inbox" ? { status: ["INBOX"] } : {}),
      ...(filter === "project" && !adv.status.length
        ? { status: ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] }
        : {}),
      ...advQ,
    },
    { enabled: filter !== "today" && filter !== "upcoming" },
  );

  const todayQuery = trpc.task.today.useQuery(
    { workspaceId: workspace.id },
    { enabled: filter === "today" },
  );

  const upcomingQuery = trpc.task.upcoming.useQuery(
    { workspaceId: workspace.id },
    { enabled: filter === "upcoming" },
  );

  const isLoading =
    filter === "today"
      ? todayQuery.isLoading
      : filter === "upcoming"
        ? upcomingQuery.isLoading
        : listQuery.isLoading;

  const tasks: TaskListItem[] = useMemo(() => {
    if (filter === "today" && todayQuery.data) {
      return todayQuery.data as unknown as TaskListItem[];
    }
    if (filter === "upcoming" && upcomingQuery.data) {
      return upcomingQuery.data as unknown as TaskListItem[];
    }
    if (listQuery.data) {
      // Hide subtasks from main lists — they show under the parent in detail
      return listQuery.data.tasks.filter((t) => !t.parentTaskId);
    }
    return [];
  }, [filter, todayQuery.data, upcomingQuery.data, listQuery.data]);

  // Listen to global quick-add events (q shortcut + command palette)
  useEffect(() => {
    function handle() {
      setShowQuickAdd(true);
    }
    document.addEventListener("todouss:quick-add", handle);
    return () => document.removeEventListener("todouss:quick-add", handle);
  }, []);

  const groups = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: "", tasks }];
    }
    const defs = groupBy === "status" ? STATUS_GROUPS : PRIORITY_GROUPS;
    const buckets: Record<string, TaskListItem[]> = {};
    for (const def of defs) buckets[def.key] = [];
    for (const task of tasks) {
      const key = groupBy === "status" ? task.status : task.priority;
      if (buckets[key]) buckets[key]!.push(task);
    }
    return defs
      .map((def) => ({ key: def.key, label: def.label, tasks: buckets[def.key] ?? [] }))
      .filter((g) => g.tasks.length > 0);
  }, [tasks, groupBy]);

  function handleDragEnd(group: { key: string; tasks: TaskListItem[] }) {
    return (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const colTasks = group.tasks;
      const overIdx = colTasks.findIndex((t) => t.id === over.id);
      if (overIdx === -1) return;

      const prevOrder = overIdx > 0 ? (colTasks[overIdx - 1]?.sortOrder ?? 0) : 0;
      const nextOrder =
        overIdx < colTasks.length - 1
          ? (colTasks[overIdx + 1]?.sortOrder ?? prevOrder + 2)
          : (colTasks[overIdx]?.sortOrder ?? 0) + 1;

      const newSortOrder = (prevOrder + nextOrder) / 2;

      reorderTask.mutate({
        taskId: active.id as string,
        newSortOrder,
        workspaceId: workspace.id,
      });
    };
  }

  if (isLoading) {
    return (
      <div className={cn("max-w-3xl mx-auto", className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <TaskSkeleton key={i} />
        ))}
      </div>
    );
  }

  const defaultStatus =
    filter === "inbox"
      ? ("INBOX" as const)
      : ("TODO" as const);

  return (
    <div className={cn("max-w-3xl mx-auto", className)}>
      {groups.map((group) => (
        <div key={group.key} className={cn(groupBy !== "none" && "mb-6")}>
          {groupBy !== "none" && group.label && (
            <h3 className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
              <span className="ml-1.5 font-normal text-muted-foreground/60">
                {group.tasks.length}
              </span>
            </h3>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd(group)}
          >
            <SortableContext
              items={group.tasks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {group.tasks.map((task) => (
                <SortableTaskItem
                  key={task.id}
                  task={task}
                  workspaceId={workspace.id}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      ))}

      {tasks.length === 0 && !showQuickAdd && (
        <div className="py-8 text-center text-muted-foreground/60 text-sm">
          No tasks here yet
        </div>
      )}

      {showQuickAdd ? (
        <QuickAdd
          projectId={projectId}
          workspaceId={workspace.id}
          defaultStatus={defaultStatus}
          onClose={() => setShowQuickAdd(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowQuickAdd(true)}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors mt-1"
        >
          <Plus className="h-4 w-4" />
          Add task
        </button>
      )}

    </div>
  );
}

interface GroupByDropdownProps {
  value: GroupBy;
  onChange: (next: GroupBy) => void;
  className?: string;
}

const GROUP_LABELS: Record<GroupBy, string> = {
  none: "No grouping",
  status: "Group by status",
  priority: "Group by priority",
};

export function GroupByDropdown({ value, onChange, className }: GroupByDropdownProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handle() {
      setOpen(false);
    }
    document.addEventListener("click", handle);
    return () => document.removeEventListener("click", handle);
  }, [open]);

  return (
    <div className={cn("relative", className)} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-muted/40 transition-colors"
      >
        {GROUP_LABELS[value]}
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-44 rounded-md border border-border bg-popover shadow-md py-1">
          {(Object.keys(GROUP_LABELS) as GroupBy[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center px-3 py-1.5 text-sm transition-colors hover:bg-muted/60",
                value === option ? "text-foreground font-medium" : "text-muted-foreground",
              )}
            >
              {GROUP_LABELS[option]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
