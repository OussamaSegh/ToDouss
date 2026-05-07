"use client";

import { use, useState } from "react";
import { cn } from "@todouss/ui";
import { List, LayoutGrid } from "lucide-react";
import { TaskList, GroupByDropdown, type GroupBy } from "@/components/tasks/task-list";
import { BoardView } from "@/components/tasks/board-view";
import { trpc } from "@/lib/trpc/provider";
import { useWorkspace } from "@/lib/workspace-context";

type ViewType = "list" | "board";

interface ProjectPageProps {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = use(params);
  const workspace = useWorkspace();
  const [view, setView] = useState<ViewType>("list");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");

  const { data: projects } = trpc.project.list.useQuery({
    workspaceId: workspace.id,
  });

  const project = projects?.find((p) => p.id === projectId);

  return (
    <div className="flex h-full flex-col">
      {/* Project header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-6 shrink-0">
        <div className="flex items-center gap-2">
          {project ? (
            <>
              <div
                className="h-4 w-4 rounded-sm shrink-0"
                style={{ backgroundColor: project.color }}
              />
              <h1 className="text-lg font-semibold">{project.name}</h1>
            </>
          ) : (
            <div className="h-5 w-32 rounded bg-muted animate-pulse" />
          )}
        </div>

        <div className="flex items-center gap-2">
          {view === "list" && (
            <GroupByDropdown value={groupBy} onChange={setGroupBy} />
          )}

          {/* View switcher */}
          <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
            <ViewButton
              active={view === "list"}
              onClick={() => setView("list")}
              icon={<List className="h-3.5 w-3.5" />}
              label="List"
            />
            <ViewButton
              active={view === "board"}
              onClick={() => setView("board")}
              icon={<LayoutGrid className="h-3.5 w-3.5" />}
              label="Board"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {view === "list" ? (
          <div className="p-4">
            <TaskList filter="project" projectId={projectId} groupBy={groupBy} />
          </div>
        ) : (
          <BoardView projectId={projectId} />
        )}
      </div>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-background shadow-sm text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
