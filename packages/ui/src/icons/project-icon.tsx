import { cn } from "../cn";

interface ProjectIconProps {
  color?: string | null;
  name?: string | null;
  className?: string;
}

export function ProjectIcon({ color, name, className }: ProjectIconProps) {
  return (
    <div
      className={cn("flex h-4 w-4 items-center justify-center rounded-sm text-[9px] font-bold text-white", className)}
      style={{ backgroundColor: color || "#6366f1" }}
      aria-hidden
    >
      {(name?.[0] ?? "P").toUpperCase()}
    </div>
  );
}
