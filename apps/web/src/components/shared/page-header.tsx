"use client";

import { cn, UiSurface } from "@todouss/ui";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, icon, actions }: PageHeaderProps) {
  return (
    <UiSurface className="shrink-0 rounded-none border-x-0 border-t-0">
      <div className="flex min-h-14 items-center justify-between px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon}
          <h1 className="truncate text-base font-semibold md:text-lg">{title}</h1>
          {subtitle ? <span className="truncate text-sm text-muted-foreground">{subtitle}</span> : null}
        </div>
        {actions ? <div className={cn("flex items-center gap-2")}>{actions}</div> : null}
      </div>
    </UiSurface>
  );
}
