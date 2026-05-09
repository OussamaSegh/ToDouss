import type { AdvancedTaskFilters } from "@/components/tasks/advanced-filter-toolbar";

/** Maps UI advanced filters onto tRPC `task.list` / range / table filter fields. */
export function trpcFiltersFromAdvanced(f: AdvancedTaskFilters): {
  assigneeId?: string[];
  labelIds?: string[];
  status?: AdvancedTaskFilters["status"];
  priority?: AdvancedTaskFilters["priority"];
} {
  return {
    ...(f.assigneeId.length ? { assigneeId: f.assigneeId } : {}),
    ...(f.labelIds.length ? { labelIds: f.labelIds } : {}),
    ...(f.status.length ? { status: f.status } : {}),
    ...(f.priority.length ? { priority: f.priority } : {}),
  };
}

export function advancedFiltersFromSavedJson(raw: unknown): AdvancedTaskFilters {
  const empty: AdvancedTaskFilters = { assigneeId: [], labelIds: [], status: [], priority: [] };
  if (!raw || typeof raw !== "object") return empty;
  const o = raw as Record<string, unknown>;
  const assigneeId = Array.isArray(o.assigneeId)
    ? o.assigneeId.filter((x): x is string => typeof x === "string")
    : [];
  const labelIds = Array.isArray(o.labelIds)
    ? o.labelIds.filter((x): x is string => typeof x === "string")
    : [];
  const status = Array.isArray(o.status)
    ? o.status.filter(
        (x): x is AdvancedTaskFilters["status"][number] =>
          x === "INBOX" ||
          x === "TODO" ||
          x === "IN_PROGRESS" ||
          x === "IN_REVIEW" ||
          x === "DONE" ||
          x === "CANCELLED",
      )
    : [];
  const priority = Array.isArray(o.priority)
    ? o.priority.filter(
        (x): x is AdvancedTaskFilters["priority"][number] =>
          x === "P1" || x === "P2" || x === "P3" || x === "P4",
      )
    : [];
  return { assigneeId, labelIds, status, priority };
}
