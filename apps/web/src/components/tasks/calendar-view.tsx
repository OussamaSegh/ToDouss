"use client";

import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay } from "date-fns";
import { trpc } from "@/lib/trpc/provider";
import { useWorkspace } from "@/lib/workspace-context";

interface CalendarViewProps {
  projectId: string;
}

export function CalendarView({ projectId }: CalendarViewProps) {
  const workspace = useWorkspace();
  const from = startOfMonth(new Date());
  const to = endOfMonth(new Date());
  const days = eachDayOfInterval({ start: from, end: to });

  const { data } = trpc.task.calendarRange.useQuery({
    workspaceId: workspace.id,
    projectId,
    from,
    to,
  });

  return (
    <div className="grid grid-cols-7 gap-2 p-4">
      {days.map((day) => {
        const tasks = (data ?? []).filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), day));
        return (
          <div key={day.toISOString()} className="min-h-24 rounded-md border border-border p-2">
            <p className="mb-1 text-xs font-medium text-muted-foreground">{format(day, "d MMM")}</p>
            <div className="space-y-1">
              {tasks.slice(0, 3).map((task) => (
                <div key={task.id} className="truncate rounded bg-muted px-1.5 py-0.5 text-xs">
                  {task.title}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
