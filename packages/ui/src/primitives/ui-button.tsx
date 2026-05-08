import type { ButtonHTMLAttributes } from "react";
import { cn } from "../cn";

type UiButtonVariant = "primary" | "secondary" | "ghost";
type UiButtonSize = "sm" | "md";

interface UiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: UiButtonVariant;
  size?: UiButtonSize;
}

const variantClasses: Record<UiButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "border border-border bg-background text-foreground hover:bg-muted/60",
  ghost: "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
};

const sizeClasses: Record<UiButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-3.5 text-sm",
};

export function UiButton({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: UiButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}

