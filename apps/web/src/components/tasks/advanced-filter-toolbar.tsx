"use client";

import { useState } from "react";
import { Filter, RotateCcw } from "lucide-react";
import { cn } from "@todouss/ui";

export interface AdvancedTaskFilters {
  assigneeId: string[];
  labelIds: string[];
  status: Array<"INBOX" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED">;
  priority: Array<"P1" | "P2" | "P3" | "P4">;
}

interface AdvancedFilterToolbarProps {
  value: AdvancedTaskFilters;
  onChange: (next: AdvancedTaskFilters) => void;
}

export function AdvancedFilterToolbar({ value, onChange }: AdvancedFilterToolbarProps) {
  const [open, setOpen] = useState(false);
  const hasFilters =
    value.assigneeId.length > 0 ||
    value.labelIds.length > 0 ||
    value.status.length > 0 ||
    value.priority.length > 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
          hasFilters ? "border-primary/40 bg-primary/5 text-primary" : "border-border text-muted-foreground hover:text-foreground",
        )}
      >
        <Filter className="h-3.5 w-3.5" />
        Filters
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-md border border-border bg-popover p-2 shadow-md">
          <button
            type="button"
            onClick={() => onChange({ assigneeId: [], labelIds: [], status: [], priority: [] })}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset all filters
          </button>
        </div>
      ) : null}
    </div>
  );
}
