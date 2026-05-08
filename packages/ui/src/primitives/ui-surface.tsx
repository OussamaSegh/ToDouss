import type { HTMLAttributes } from "react";
import { cn } from "../cn";

interface UiSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export function UiSurface({ elevated = false, className, ...props }: UiSurfaceProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-background",
        elevated && "shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

