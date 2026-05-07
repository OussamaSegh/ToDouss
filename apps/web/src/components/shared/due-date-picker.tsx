"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@todouss/ui";
import { Calendar, X } from "lucide-react";
import { format, isToday, isTomorrow, isPast, isThisYear } from "date-fns";

interface DueDatePickerProps {
  value: Date | null | undefined;
  onChange: (date: Date | null) => void;
  className?: string;
  showIcon?: boolean;
}

function formatDueDate(date: Date): { label: string; overdue: boolean } {
  if (isToday(date)) return { label: "Today", overdue: false };
  if (isTomorrow(date)) return { label: "Tomorrow", overdue: false };
  const overdue = isPast(date);
  const fmt = isThisYear(date) ? "MMM d" : "MMM d, yyyy";
  return { label: format(date, fmt), overdue };
}

export function DueDatePicker({ value, onChange, className, showIcon = true }: DueDatePickerProps) {
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

  const formatted = value ? formatDueDate(value) : null;

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
        <div className="absolute left-0 top-full z-50 mt-1 rounded-md border border-border bg-popover shadow-md p-2 min-w-[200px]">
          <input
            type="date"
            defaultValue={value ? format(value, "yyyy-MM-dd") : ""}
            onChange={(e) => {
              if (e.target.value) {
                onChange(new Date(e.target.value + "T00:00:00"));
              } else {
                onChange(null);
              }
              setOpen(false);
            }}
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="mt-1 flex w-full items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted/60 transition-colors"
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
