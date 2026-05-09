"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@todouss/ui";
import { Calendar, X } from "lucide-react";
import { format, isToday, isTomorrow, isPast, isThisYear } from "date-fns";

interface DueDatePickerProps {
  value: Date | null | undefined;
  onChange: (date: Date | null) => void;
  /** When provided, shows time controls and notifies when user toggles timed vs date-only. */
  dueTime?: boolean;
  onDueTimeChange?: (hasTime: boolean) => void;
  className?: string;
  showIcon?: boolean;
}

function formatDueDate(date: Date, timed: boolean): { label: string; overdue: boolean } {
  if (isToday(date)) {
    return {
      label: timed ? `Today · ${format(date, "HH:mm")}` : "Today",
      overdue: false,
    };
  }
  if (isTomorrow(date)) {
    return {
      label: timed ? `Tomorrow · ${format(date, "HH:mm")}` : "Tomorrow",
      overdue: false,
    };
  }
  const overdue = isPast(date) && !isToday(date);
  const fmt = isThisYear(date)
    ? timed
      ? "MMM d · HH:mm"
      : "MMM d"
    : timed
      ? "MMM d, yyyy · HH:mm"
      : "MMM d, yyyy";
  return { label: format(date, fmt), overdue };
}

export function DueDatePicker({
  value,
  onChange,
  dueTime = false,
  onDueTimeChange,
  className,
  showIcon = true,
}: DueDatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const formatted = value ? formatDueDate(value, dueTime) : null;

  function applyDateOnly(ymd: string) {
    if (!ymd) {
      onChange(null);
      onDueTimeChange?.(false);
      setOpen(false);
      return;
    }
    const next = new Date(ymd + "T00:00:00");
    if (dueTime && value) {
      next.setHours(value.getHours(), value.getMinutes(), 0, 0);
    }
    onChange(next);
    setOpen(false);
  }

  function applyTime(hm: string) {
    if (!value || !hm) return;
    const parts = hm.split(":");
    const h = parseInt(parts[0] ?? "", 10);
    const m = parseInt(parts[1] ?? "0", 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return;
    const next = new Date(value);
    next.setHours(h, m, 0, 0);
    onChange(next);
    onDueTimeChange?.(true);
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={cn(
          "flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors",
          formatted?.overdue
            ? "text-red-500 hover:bg-red-50"
            : formatted
              ? "text-muted-foreground hover:bg-muted/60"
              : "text-muted-foreground/60 hover:bg-muted/60 hover:text-muted-foreground",
        )}
      >
        {showIcon && <Calendar className="h-3 w-3 shrink-0" />}
        {formatted ? formatted.label : "Due date"}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 rounded-md border border-border bg-popover shadow-md p-2 min-w-[200px] space-y-2">
          <input
            type="date"
            value={value ? format(value, "yyyy-MM-dd") : ""}
            onChange={(e) => applyDateOnly(e.target.value)}
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {onDueTimeChange ? (
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={dueTime}
                  onChange={(e) => {
                    const on = e.target.checked;
                    onDueTimeChange(on);
                    if (!on && value) {
                      const next = new Date(value);
                      next.setHours(0, 0, 0, 0);
                      onChange(next);
                    } else if (on && value) {
                      const next = new Date(value);
                      if (next.getHours() === 0 && next.getMinutes() === 0) {
                        next.setHours(9, 0, 0, 0);
                      }
                      onChange(next);
                    }
                  }}
                  className="rounded border-border"
                />
                Include time
              </label>
              {dueTime && value ? (
                <input
                  type="time"
                  value={format(value, "HH:mm")}
                  onChange={(e) => applyTime(e.target.value)}
                  className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                />
              ) : null}
            </div>
          ) : null}
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                onDueTimeChange?.(false);
                setOpen(false);
              }}
              className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted/60 transition-colors"
            >
              <X className="h-3 w-3" />
              Clear date
            </button>
          )}
        </div>
      )}
    </div>
  );
}
