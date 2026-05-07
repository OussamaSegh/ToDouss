"use client";

import { useMemo } from "react";
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
import { GripVertical } from "lucide-react";
import { trpc } from "@/lib/trpc/provider";
import { useWorkspace } from "@/lib/workspace-context";
import { useUpdateTask, useReorderTask } from "@/hooks/use-task-mutations";
import { useTaskStore } from "@/stores/task-store";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@todouss/trpc";

type RouterOutput = inferRouterOutputs<AppRouter>;
type TaskListItem = RouterOutput["task"]["list"]["tasks"][number];
type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED";

const COLUMNS: { status: TaskStatus; label: string; headerClass: string }[] = [
  { status: "TODO", label: "To Do", headerClass: "text-gray-600" },
  { status: "IN_PROGRESS", label: "In Progress", headerClass: "text-blue-600" },
  { status: "IN_REVIEW", label: "In Review", headerClass: "text-purple-600" },
  { status: "DONE", label: "Done", headerClass: "text-green-600" },
  { status: "CANCELLED", label: "Cancelled", headerClass: "text-gray-400" },
];

function formatDueShort(date: Date) {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "MMM d");
}

function BoardCard({ task }: { task: TaskListItem; workspaceId: string }) {
  const openDetail = useTaskStore((s) => s.openDetail);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const dueDateInfo = task.dueDate
    ? {
        label: formatDueShort(new Date(task.dueDate)),
        overdue: isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)),
      }
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => openDetail(task.id)}
      className={cn(
        "group/card relative rounded-md border border-border bg-background p-3 shadow-sm cursor-pointer",
        "hover:border-primary/40 hover:shadow-md transition-all select-none",
        isDragging && "shadow-lg rotate-1",
      )}
    >
      {/* Dedicated drag handle — only this region triggers dnd-kit drag */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        aria-label="Drag card"
        className={cn(
          "absolute left-1 top-1/2 -translate-y-1/2 flex h-6 w-4 items-center justify-center",
          "text-muted-foreground/40 opacity-0 group-hover/card:opacity-100 transition-opacity",
          "cursor-grab active:cursor-grabbing",
        )}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <div className="pl-3">
        <p className="text-sm font-medium text-foreground leading-snug mb-2">{task.title}</p>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <PriorityBadge priority={task.priority as Parameters<typeof PriorityBadge>[0]["priority"]} variant="dot" />
            {task.labels.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {task.labels.length} label{task.labels.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          {dueDateInfo && (
            <span
              className={cn(
                "text-xs",
                dueDateInfo.overdue ? "text-red-500" : "text-muted-foreground",
              )}
            >
              {dueDateInfo.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function BoardColumn({
  status,
  label,
  headerClass,
  tasks,
  workspaceId,
}: {
  status: TaskStatus;
  label: string;
  headerClass: string;
  tasks: TaskListItem[];
  workspaceId: string;
}) {
  return (
    <div className="flex flex-col w-64 shrink-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className={cn("text-xs font-semibold uppercase tracking-wider", headerClass)}>
          {label}
        </h3>
        <span className="text-xs text-muted-foreground rounded-full bg-muted px-1.5 py-0.5">
          {tasks.length}
        </span>
      </div>
      <div className="flex-1 rounded-lg bg-muted/30 p-2 min-h-[120px]">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {tasks.map((task) => (
              <BoardCard key={task.id} task={task} workspaceId={workspaceId} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

interface BoardViewProps {
  projectId: string;
  className?: string;
}

export function BoardView({ projectId, className }: BoardViewProps) {
  const workspace = useWorkspace();
  const updateTask = useUpdateTask();
  const reorderTask = useReorderTask();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const { data, isLoading } = trpc.task.list.useQuery({
    workspaceId: workspace.id,
    projectId,
  });

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, TaskListItem[]> = {
      TODO: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      DONE: [],
      CANCELLED: [],
    };
    if (!data) return map;
    for (const task of data.tasks) {
      const status = task.status as TaskStatus;
      if (status in map) {
        map[status].push(task);
      }
    }
    return map;
  }, [data]);

  function findTask(id: string): TaskListItem | undefined {
    return data?.tasks.find((t) => t.id === id);
  }

  function findTaskStatus(id: string): TaskStatus | undefined {
    const task = findTask(id);
    return task?.status as TaskStatus | undefined;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeTask = findTask(active.id as string);
    const overTask = findTask(over.id as string);
    if (!activeTask) return;

    const activeStatus = activeTask.status as TaskStatus;
    const overStatus = overTask
      ? (overTask.status as TaskStatus)
      : findTaskStatus(over.id as string) ?? activeStatus;

    if (activeStatus !== overStatus) {
      // Cross-column drag → update status
      updateTask.mutate({
        id: activeTask.id,
        workspaceId: workspace.id,
        status: overStatus,
      });
    } else if (overTask) {
      // Same column reorder
      const col = tasksByStatus[activeStatus];
      const activeIdx = col.findIndex((t) => t.id === active.id);
      const overIdx = col.findIndex((t) => t.id === over.id);

      const prevOrder = overIdx > 0 ? (col[overIdx - 1]?.boardOrder ?? 0) : 0;
      const nextOrder =
        overIdx < col.length - 1
          ? (col[overIdx + 1]?.boardOrder ?? prevOrder + 2)
          : (col[overIdx]?.boardOrder ?? 0) + 1;

      const newBoardOrder = (prevOrder + nextOrder) / 2;
      reorderTask.mutate({
        taskId: activeTask.id,
        newSortOrder: activeTask.sortOrder,
        newBoardOrder,
        newStatus: overStatus,
        workspaceId: workspace.id,
      });
    }
  }

  if (isLoading) {
    return (
      <div className={cn("flex gap-4 overflow-x-auto p-4", className)}>
        {COLUMNS.map((col) => (
          <div key={col.status} className="w-64 shrink-0 animate-pulse space-y-2">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="rounded-lg bg-muted/30 p-2 h-40" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex gap-4 overflow-x-auto p-4 h-full", className)}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {COLUMNS.map((col) => (
          <BoardColumn
            key={col.status}
            status={col.status}
            label={col.label}
            headerClass={col.headerClass}
            tasks={tasksByStatus[col.status]}
            workspaceId={workspace.id}
          />
        ))}
      </DndContext>
    </div>
  );
}
