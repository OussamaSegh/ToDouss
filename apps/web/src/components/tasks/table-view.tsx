"use client";

import { format } from "date-fns";
import { trpc } from "@/lib/trpc/provider";
import { useWorkspace } from "@/lib/workspace-context";

interface TableViewProps {
  projectId: string;
}

export function TableView({ projectId }: TableViewProps) {
  const workspace = useWorkspace();
  const { data } = trpc.task.tableList.useQuery({
    workspaceId: workspace.id,
    projectId,
    limit: 100,
    isArchived: false,
    includeCompleted: true,
  });

  return (
    <div className="overflow-auto p-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="px-2 py-2">Task</th>
            <th className="px-2 py-2">Status</th>
            <th className="px-2 py-2">Priority</th>
            <th className="px-2 py-2">Due</th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((task) => (
            <tr key={task.id} className="border-b border-border/60">
              <td className="px-2 py-2">{task.title}</td>
              <td className="px-2 py-2">{task.status}</td>
              <td className="px-2 py-2">{task.priority}</td>
              <td className="px-2 py-2">
                {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
