"use client";

import { format } from "date-fns";
import { trpc } from "@/lib/trpc/provider";
import { useWorkspace } from "@/lib/workspace-context";
import type { AdvancedTaskFilters } from "@/components/tasks/advanced-filter-toolbar";
import { trpcFiltersFromAdvanced } from "@/lib/task-filters";

interface TimelineViewProps {
  projectId: string;
  advancedFilters?: AdvancedTaskFilters;
}

export function TimelineView({ projectId, advancedFilters }: TimelineViewProps) {
  const workspace = useWorkspace();
  const advQ = trpcFiltersFromAdvanced(
    advancedFilters ?? { assigneeId: [], labelIds: [], status: [], priority: [] },
  );
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 30);

  const { data } = trpc.task.timelineRange.useQuery({
    workspaceId: workspace.id,
    projectId,
    from,
    to,
    ...advQ,
  });

  return (
    <div className="space-y-2 p-4">
      {(data ?? []).map((task) => (
        <div key={task.id} className="rounded-md border border-border p-3">
          <p className="text-sm font-medium">{task.title}</p>
          <p className="text-xs text-muted-foreground">
            {task.startDate ? format(new Date(task.startDate), "MMM d") : "No start"} -{" "}
            {task.dueDate ? format(new Date(task.dueDate), "MMM d") : "No due"}
          </p>
        </div>
      ))}
    </div>
  );
}
