"use client";

import { cn, UiIcon } from "@todouss/ui";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@todouss/trpc";
import { useTaskStore } from "@/stores/task-store";
import { useUpdateTask } from "@/hooks/use-task-mutations";
import { StatusCheckbox } from "@/components/shared/status-select";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { format, isToday, isTomorrow, isPast, isThisYear } from "date-fns";

type RouterOutput = inferRouterOutputs<AppRouter>;
type TaskListItem = RouterOutput["task"]["list"]["tasks"][number];

interface TaskItemProps {
  task: TaskListItem;
  workspaceId: string;
  className?: string;
}

function formatDueDate(date: Date): { label: string; overdue: boolean } {
  if (isToday(date)) return { label: "Today", overdue: false };
  if (isTomorrow(date)) return { label: "Tomorrow", overdue: false };
  const overdue = isPast(date);
  const fmt = isThisYear(date) ? "MMM d" : "MMM d, yyyy";
  return { label: format(date, fmt), overdue };
}

export function TaskItem({ task, workspaceId, className }: TaskItemProps) {
  const openDetail = useTaskStore((s) => s.openDetail);
  const updateTask = useUpdateTask();

  const isDone = task.status === "DONE";
  const isCancelled = task.status === "CANCELLED";
  const dueDateInfo = task.dueDate ? formatDueDate(new Date(task.dueDate)) : null;
  const commentCount = task._count?.comments ?? 0;

  function handleToggleStatus() {
    updateTask.mutate({
      id: task.id,
      workspaceId,
      status: isDone ? "TODO" : "DONE",
    });
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors cursor-pointer",
        "border border-transparent hover:border-border hover:bg-muted/40",
        className,
      )}
      onClick={() => openDetail(task.id)}
    >
      {/* Status checkbox */}
      <StatusCheckbox
        status={task.status as Parameters<typeof StatusCheckbox>[0]["status"]}
        priority={task.priority as Parameters<typeof StatusCheckbox>[0]["priority"]}
        onChange={handleToggleStatus}
      />

      {/* Title */}
      <span
        className={cn(
          "flex-1 text-sm leading-snug select-none truncate",
          (isDone || isCancelled) && "line-through text-muted-foreground",
        )}
      >
        {task.title}
      </span>

      {/* Meta row */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Labels */}
        {task.labels.length > 0 && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {task.labels.slice(0, 2).map((tl) => (
              <span
                key={tl.labelId}
                className="rounded-full px-1.5 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: tl.label.color }}
              >
                {tl.label.name}
              </span>
            ))}
            {task.labels.length > 2 && (
              <span className="text-xs text-muted-foreground">+{task.labels.length - 2}</span>
            )}
          </div>
        )}

        {/* Priority — always visible for P1/P2 */}
        {(task.priority === "P1" || task.priority === "P2") && (
          <PriorityBadge
            priority={task.priority}
            variant="badge"
            className="opacity-70 group-hover:opacity-100 transition-opacity"
          />
        )}
        {(task.priority === "P3" || task.priority === "P4") && (
          <PriorityBadge
            priority={task.priority}
            variant="badge"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          />
        )}

        {/* Due date */}
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

        {commentCount > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <UiIcon name="notification" className="h-3 w-3" />
            {commentCount}
          </span>
        )}
      </div>
    </div>
  );
}
