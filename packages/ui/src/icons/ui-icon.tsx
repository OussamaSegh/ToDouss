import type { LucideProps } from "lucide-react";
import { cn } from "../cn";
import { CUSTOM_ICON_REGISTRY, type CustomIconName } from "./custom-icons";
import { ICON_FALLBACK, type IconName, LUCIDE_ICON_REGISTRY } from "./icon-registry";

interface UiIconProps extends Omit<LucideProps, "ref"> {
  name: IconName | CustomIconName;
}

export function UiIcon({ name, className, ...props }: UiIconProps) {
  const custom = CUSTOM_ICON_REGISTRY[name as CustomIconName];
  if (custom) {
    const Custom = custom;
    return <Custom className={cn("h-4 w-4 shrink-0", className)} {...props} />;
  }
  const Icon = LUCIDE_ICON_REGISTRY[name as IconName] ?? LUCIDE_ICON_REGISTRY[ICON_FALLBACK];
  return <Icon className={cn("h-4 w-4 shrink-0", className)} {...props} />;
}
