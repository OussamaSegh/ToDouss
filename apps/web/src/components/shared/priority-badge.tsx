"use client";

import { cn } from "@todouss/ui";

export type Priority = "P1" | "P2" | "P3" | "P4";

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; dotClass: string; badgeClass: string }
> = {
  P1: {
    label: "Urgent",
    dotClass: "bg-red-500",
    badgeClass: "text-red-600 bg-red-50 border-red-200",
  },
  P2: {
    label: "High",
    dotClass: "bg-orange-500",
    badgeClass: "text-orange-600 bg-orange-50 border-orange-200",
  },
  P3: {
    label: "Medium",
    dotClass: "bg-blue-500",
    badgeClass: "text-blue-600 bg-blue-50 border-blue-200",
  },
  P4: {
    label: "Low",
    dotClass: "bg-gray-400",
    badgeClass: "text-gray-500 bg-gray-50 border-gray-200",
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
