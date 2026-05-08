"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@todouss/ui";
import { Check, ChevronDown } from "lucide-react";

export type TaskStatus = "INBOX" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED";

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; circleClass: string; ringClass: string }
> = {
  INBOX: {
    label: "Inbox",
    circleClass: "border-[var(--status-inbox-border)] bg-[var(--status-inbox-bg)]",
    ringClass: "border-[var(--status-inbox-border)]",
  },
  TODO: {
    label: "To Do",
    circleClass: "border-[var(--status-todo-border)] bg-[var(--status-todo-bg)]",
    ringClass: "border-[var(--status-todo-border)]",
  },
  IN_PROGRESS: {
    label: "In Progress",
    circleClass: "border-[var(--status-progress-border)] bg-[var(--status-progress-bg)]",
    ringClass: "border-[var(--status-progress-border)]",
  },
  IN_REVIEW: {
    label: "In Review",
    circleClass: "border-[var(--status-review-border)] bg-[var(--status-review-bg)]",
    ringClass: "border-[var(--status-review-border)]",
  },
  DONE: {
    label: "Done",
    circleClass: "bg-[var(--status-done-bg)] border-[var(--status-done-border)]",
    ringClass: "border-[var(--status-done-border)]",
  },
  CANCELLED: {
    label: "Cancelled",
    circleClass: "bg-[var(--status-cancelled-bg)] border-[var(--status-cancelled-border)]",
    ringClass: "border-[var(--status-cancelled-border)]",
  },
};

const STATUS_ORDER: TaskStatus[] = [
  "INBOX",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "CANCELLED",
];

interface StatusSelectProps {
  value: TaskStatus;
  onChange: (value: TaskStatus) => void;
  className?: string;
  showLabel?: boolean;
}

export function StatusSelect({
  value,
  onChange,
  className,
  showLabel = false,
}: StatusSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const config = STATUS_CONFIG[value];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="flex items-center gap-1.5 rounded hover:bg-muted/60 px-1 py-0.5 transition-colors"
      >
        <span
          className={cn(
            "h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
            config.circleClass,
          )}
        >
          {value === "DONE" && <Check className="h-2.5 w-2.5 text-white" />}
        </span>
        {showLabel && (
          <>
            <span className="text-sm text-foreground">{config.label}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-44 rounded-md border border-border bg-popover shadow-md py-1">
          {STATUS_ORDER.map((status) => {
            const sc = STATUS_CONFIG[status];
            return (
              <button
                key={status}
                type="button"
                onClick={() => {
                  onChange(status);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-1.5 text-sm transition-colors hover:bg-muted/60",
                  value === status ? "text-foreground font-medium" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "h-3.5 w-3.5 rounded-full border-2 shrink-0 flex items-center justify-center",
                    sc.circleClass,
                  )}
                >
                  {status === "DONE" && <Check className="h-2 w-2 text-white" />}
                </span>
                {sc.label}
                {value === status && <Check className="h-3 w-3 ml-auto text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface StatusCheckboxProps {
  status: TaskStatus;
  priority: "P1" | "P2" | "P3" | "P4";
  onChange: (newStatus: TaskStatus) => void;
  className?: string;
}

const PRIORITY_BORDER: Record<string, string> = {
  P1: "border-[var(--priority-p1-border)] hover:bg-[var(--priority-p1-bg)]",
  P2: "border-[var(--priority-p2-border)] hover:bg-[var(--priority-p2-bg)]",
  P3: "border-[var(--priority-p3-border)] hover:bg-[var(--priority-p3-bg)]",
  P4: "border-[var(--priority-p4-border)] hover:bg-[var(--priority-p4-bg)]",
};

export function StatusCheckbox({ status, priority, onChange, className }: StatusCheckboxProps) {
  const isDone = status === "DONE";
  const isCancelled = status === "CANCELLED";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange(isDone ? "TODO" : "DONE");
      }}
      className={cn(
        "h-4 w-4 rounded-full border-2 shrink-0 transition-colors flex items-center justify-center",
        isDone || isCancelled
          ? "bg-[var(--status-done-bg)] border-[var(--status-done-border)]"
          : PRIORITY_BORDER[priority] ?? PRIORITY_BORDER.P4,
        className,
      )}
      title={isDone ? "Mark as incomplete" : "Mark as complete"}
    >
      {(isDone || isCancelled) && <Check className="h-2.5 w-2.5 text-white" />}
    </button>
  );
}
