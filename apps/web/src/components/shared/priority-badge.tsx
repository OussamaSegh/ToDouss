"use client";

import { cn } from "@todouss/ui";

export type Priority = "P1" | "P2" | "P3" | "P4";

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; dotClass: string; badgeClass: string }
> = {
  P1: {
    label: "Urgent",
    dotClass: "bg-[var(--priority-p1-dot)]",
    badgeClass: "text-[var(--priority-p1-fg)] bg-[var(--priority-p1-bg)] border-[var(--priority-p1-border)]",
  },
  P2: {
    label: "High",
    dotClass: "bg-[var(--priority-p2-dot)]",
    badgeClass: "text-[var(--priority-p2-fg)] bg-[var(--priority-p2-bg)] border-[var(--priority-p2-border)]",
  },
  P3: {
    label: "Medium",
    dotClass: "bg-[var(--priority-p3-dot)]",
    badgeClass: "text-[var(--priority-p3-fg)] bg-[var(--priority-p3-bg)] border-[var(--priority-p3-border)]",
  },
  P4: {
    label: "Low",
    dotClass: "bg-[var(--priority-p4-dot)]",
    badgeClass: "text-[var(--priority-p4-fg)] bg-[var(--priority-p4-bg)] border-[var(--priority-p4-border)]",
  },
};

interface PriorityBadgeProps {
  priority: Priority;
  variant?: "badge" | "dot";
  className?: string;
}

export function PriorityBadge({
  priority,
  variant = "badge",
  className,
}: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];

  if (variant === "dot") {
    return (
      <span
        className={cn("inline-block h-2 w-2 rounded-full shrink-0", config.dotClass, className)}
        title={config.label}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium",
        config.badgeClass,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotClass)} />
      {priority}
    </span>
  );
}
