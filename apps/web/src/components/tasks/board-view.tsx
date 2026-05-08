"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { cn } from "@todouss/ui";
import {
  DndContext,
  closestCorners,
  pointerWithin,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
  useDndMonitor,
  useDroppable,
  type CollisionDetection,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MessageSquare } from "lucide-react";
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

/** Prefer pointer/overlap over pure center distance — required for usable kanban collisions. */
const boardCollisionDetection: CollisionDetection = (args) => {
  const pointers = pointerWithin(args);
  if (pointers.length > 0) return pointers;

  const rects = rectIntersection(args);
  if (rects.length > 0) return rects;

  return closestCorners(args);
};

function formatDueShort(date: Date) {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "MMM d");
}

function boardColumnDropId(status: TaskStatus) {
  return `board-drop-${status}`;
}

/** Inside DndContext — stamps time on drag end so card clicks don't open detail right after reorder. */
function RecordDragEndedAt({ atRef }: { atRef: MutableRefObject<number> }) {
  useDndMonitor({
    onDragEnd() {
      atRef.current = Date.now();
    },
    onDragCancel() {
      atRef.current = Date.now();
    },
  });
  return null;
}

function BoardCard({
  task,
  lastDragEndedAt,
}: {
  task: TaskListItem;
  lastDragEndedAt: MutableRefObject<number>;
}) {
  const openDetail = useTaskStore((s) => s.openDetail);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

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
  const commentCount = task._count?.comments ?? 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (Date.now() - lastDragEndedAt.current < 280) return;
        openDetail(task.id);
      }}
      className={cn(
        "group/card relative rounded-md border border-border bg-background p-3 pl-9 shadow-sm",
        "hover:border-primary/40 hover:shadow-md transition-all select-none touch-manipulation cursor-grab active:cursor-grabbing",
        isDragging && "shadow-lg rotate-1 z-10",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2",
          "text-muted-foreground/50",
        )}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </span>

      <p className="text-sm font-medium text-foreground leading-snug mb-2">{task.title}</p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <PriorityBadge priority={task.priority as Parameters<typeof PriorityBadge>[0]["priority"]} variant="dot" />
          {task.labels.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {task.labels.length} label{task.labels.length > 1 ? "s" : ""}
            </span>
          )}
          {commentCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              {commentCount}
            </span>
          )}
        </div>
        {dueDateInfo && (
          <span
            className={cn("text-xs", dueDateInfo.overdue ? "text-red-500" : "text-muted-foreground")}
          >
            {dueDateInfo.label}
          </span>
        )}
      </div>
    </div>
  );
}

function BoardColumn({
  status,
  label,
  headerClass,
  tasks,
  lastDragEndedAt,
}: {
  status: TaskStatus;
  label: string;
  headerClass: string;
  tasks: TaskListItem[];
  lastDragEndedAt: MutableRefObject<number>;
}) {
  const dropId = boardColumnDropId(status);
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: dropId,
    data: { type: "board-column", status },
  });

  return (
    <div className="flex flex-col w-64 shrink-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className={cn("text-xs font-semibold uppercase tracking-wider", headerClass)}>{label}</h3>
        <span className="text-xs text-muted-foreground rounded-full bg-muted px-1.5 py-0.5">
          {tasks.length}
        </span>
      </div>
      <div
        ref={setDropRef}
        className={cn(
          "flex-1 rounded-lg bg-muted/30 p-2 min-h-[120px]",
          isOver &&
            "ring-2 ring-primary/35 ring-offset-2 ring-offset-[var(--surface-base)] rounded-lg",
        )}
      >
        <div className="space-y-2">
          {tasks.map((task) => (
            <BoardCard key={task.id} task={task} lastDragEndedAt={lastDragEndedAt} />
          ))}
        </div>
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
  const lastDragEndedAt = useRef(0);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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

  const sortableIds = useMemo(
    () => COLUMNS.flatMap((c) => tasksByStatus[c.status].map((t) => t.id)),
    [tasksByStatus],
  );

  function findTask(id: string): TaskListItem | undefined {
    return data?.tasks.find((t) => t.id === id);
  }

  function findTaskStatus(id: string): TaskStatus | undefined {
    const task = findTask(id);
    return task?.status as TaskStatus | undefined;
  }

  function dropIdToStatus(id: UniqueIdentifier): TaskStatus | null {
    const s = String(id);
    const prefix = "board-drop-";
    if (!s.startsWith(prefix)) return null;
    const raw = s.slice(prefix.length);
    return COLUMNS.some((c) => c.status === raw) ? (raw as TaskStatus) : null;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeTask = findTask(active.id as string);
    if (!activeTask) return;

    const activeStatus = activeTask.status as TaskStatus;

    const columnDropStatus = dropIdToStatus(over.id);
    if (columnDropStatus) {
      if (activeStatus !== columnDropStatus) {
        updateTask.mutate({
          id: activeTask.id,
          workspaceId: workspace.id,
          status: columnDropStatus,
        });
      }
      return;
    }

    const overTask = findTask(over.id as string);

    const overStatus = overTask
      ? (overTask.status as TaskStatus)
      : findTaskStatus(over.id as string) ?? activeStatus;

    if (activeStatus !== overStatus) {
      updateTask.mutate({
        id: activeTask.id,
        workspaceId: workspace.id,
        status: overStatus,
      });
    } else if (overTask) {
      const col = tasksByStatus[activeStatus];
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
      <DndContext sensors={sensors} collisionDetection={boardCollisionDetection} onDragEnd={handleDragEnd}>
        <RecordDragEndedAt atRef={lastDragEndedAt} />
        <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
          <div className="flex gap-4">
            {COLUMNS.map((col) => (
              <BoardColumn
                key={col.status}
                status={col.status}
                label={col.label}
                headerClass={col.headerClass}
                tasks={tasksByStatus[col.status]}
                lastDragEndedAt={lastDragEndedAt}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
