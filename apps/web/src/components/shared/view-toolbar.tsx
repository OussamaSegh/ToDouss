"use client";

import { cn, UiSurface } from "@todouss/ui";

interface ViewToolbarProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export function ViewToolbar({ left, right, className }: ViewToolbarProps) {
  return (
    <UiSurface className={cn("rounded-none border-x-0 border-t-0 px-3 py-2 md:px-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">{left}</div>
        <div className="flex flex-wrap items-center gap-2">{right}</div>
      </div>
    </UiSurface>
  );
}
