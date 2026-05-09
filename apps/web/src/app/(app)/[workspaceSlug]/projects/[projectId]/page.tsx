"use client";

import { use, useEffect, useMemo, useState } from "react";
import { cn, ProjectIcon, UiButton, UiIcon } from "@todouss/ui";
import { TaskList, GroupByDropdown, type GroupBy } from "@/components/tasks/task-list";
import { BoardView } from "@/components/tasks/board-view";
import { CalendarView } from "@/components/tasks/calendar-view";
import { TimelineView } from "@/components/tasks/timeline-view";
import { TableView } from "@/components/tasks/table-view";
import { AdvancedFilterToolbar, type AdvancedTaskFilters } from "@/components/tasks/advanced-filter-toolbar";
import { trpc } from "@/lib/trpc/provider";
import { useWorkspace } from "@/lib/workspace-context";
import { PageHeader } from "@/components/shared/page-header";
import { ViewToolbar } from "@/components/shared/view-toolbar";
import { PageContainer } from "@/components/shared/page-container";
import { featureFlags } from "@/lib/feature-flags";
import { advancedFiltersFromSavedJson } from "@/lib/task-filters";

type ViewType = "list" | "board" | "calendar" | "timeline" | "table";

interface ProjectPageProps {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = use(params);
  const workspace = useWorkspace();
  const [view, setView] = useState<ViewType>("list");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [activeSavedView, setActiveSavedView] = useState<string>("");
  const [filters, setFilters] = useState<AdvancedTaskFilters>({
    assigneeId: [],
    labelIds: [],
    status: [],
    priority: [],
  });

  const { data: projects } = trpc.project.list.useQuery({
    workspaceId: workspace.id,
  });

  const project = projects?.find((p) => p.id === projectId);
  const utils = trpc.useUtils();
  const { data: savedViews } = trpc.savedView.list.useQuery({
    workspaceId: workspace.id,
    projectId,
  });
  const createSavedView = trpc.savedView.create.useMutation({
    onSuccess: async () => {
      await utils.savedView.list.invalidate();
    },
  });
  const deleteSavedView = trpc.savedView.delete.useMutation({
    onSuccess: async () => {
      await utils.savedView.list.invalidate();
      setActiveSavedView("");
    },
  });

  const selectedSavedView = useMemo(
    () => (activeSavedView ? savedViews?.find((v) => v.id === activeSavedView) : undefined),
    [activeSavedView, savedViews],
  );

  useEffect(() => {
    if (!selectedSavedView) return;
    setFilters(advancedFiltersFromSavedJson(selectedSavedView.filters));
    const vt = selectedSavedView.viewType.toLowerCase();
    if (vt === "list" || vt === "board" || vt === "calendar" || vt === "timeline" || vt === "table") {
      setView(vt as ViewType);
    }
    const gb = selectedSavedView.groupBy;
    if (gb === "none" || gb === "status" || gb === "priority") {
      setGroupBy(gb);
    }
  }, [selectedSavedView]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={project?.name ?? "Project"}
        icon={<ProjectIcon color={project?.color} name={project?.name} />}
      />
      <ViewToolbar
        left={
          <>
            {view === "list" && <GroupByDropdown value={groupBy} onChange={setGroupBy} />}
            <AdvancedFilterToolbar value={filters} onChange={setFilters} />
            {featureFlags.savedViews ? (
              <>
                <select
                  value={activeSavedView}
                  onChange={(e) => setActiveSavedView(e.target.value)}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                >
                  <option value="">Saved views</option>
                  {(savedViews ?? []).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                {activeSavedView ? (
                  <UiButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    disabled={deleteSavedView.isPending}
                    onClick={() =>
                      deleteSavedView.mutate({ workspaceId: workspace.id, id: activeSavedView })
                    }
                  >
                    Delete view
                  </UiButton>
                ) : null}
              </>
            ) : null}
          </>
        }
        right={
          <>
            {featureFlags.savedViews ? (
              <UiButton
                type="button"
                onClick={() =>
                  createSavedView.mutate({
                    workspaceId: workspace.id,
                    projectId,
                    name: `View ${new Date().toLocaleTimeString()}`,
                    viewType: view.toUpperCase() as "LIST" | "BOARD" | "CALENDAR" | "TIMELINE" | "TABLE",
                    filters: {
                      assigneeId: filters.assigneeId,
                      labelIds: filters.labelIds,
                      status: filters.status,
                      priority: filters.priority,
                    },
                    groupBy: groupBy === "none" ? null : groupBy,
                  })
                }
                size="sm"
              >
                Save current view
              </UiButton>
            ) : null}
            <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
              <ViewButton active={view === "list"} onClick={() => setView("list")} icon={<UiIcon name="list" />} label="List" />
              <ViewButton active={view === "board"} onClick={() => setView("board")} icon={<UiIcon name="board" />} label="Board" />
              {featureFlags.calendarView ? <ViewButton active={view === "calendar"} onClick={() => setView("calendar")} icon={<UiIcon name="calendar" />} label="Calendar" /> : null}
              {featureFlags.timelineView ? <ViewButton active={view === "timeline"} onClick={() => setView("timeline")} icon={<UiIcon name="timeline" />} label="Timeline" /> : null}
              {featureFlags.tableView ? <ViewButton active={view === "table"} onClick={() => setView("table")} icon={<UiIcon name="table" />} label="Table" /> : null}
            </div>
          </>
        }
      />

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <PageContainer className="max-w-none p-0">
          {view === "list" ? (
            <TaskList filter="project" projectId={projectId} groupBy={groupBy} advancedFilters={filters} />
          ) : null}
          {view === "board" ? <BoardView projectId={projectId} advancedFilters={filters} /> : null}
          {view === "calendar" && featureFlags.calendarView ? (
            <CalendarView projectId={projectId} advancedFilters={filters} />
          ) : null}
          {view === "timeline" && featureFlags.timelineView ? (
            <TimelineView projectId={projectId} advancedFilters={filters} />
          ) : null}
          {view === "table" && featureFlags.tableView ? (
            <TableView projectId={projectId} advancedFilters={filters} />
          ) : null}
        </PageContainer>
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
    <UiButton
      type="button"
      onClick={onClick}
      size="sm"
      variant={active ? "secondary" : "ghost"}
      className={cn(
        "gap-1.5",
        active && "shadow-sm",
      )}
    >
      {icon}
      {label}
    </UiButton>
  );
}
