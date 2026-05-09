"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { cn } from "@todouss/ui";
import { Check, X, Calendar } from "lucide-react";
import { useCreateTask } from "@/hooks/use-task-mutations";
import { format } from "date-fns";
import type { TaskStatus } from "@/components/shared/status-select";

// Dynamic import for chrono-node to avoid SSR issues
let chrono: typeof import("chrono-node") | null = null;
if (typeof window !== "undefined") {
  import("chrono-node").then((m) => {
    chrono = m;
  });
}

interface QuickAddProps {
  projectId?: string;
  workspaceId: string;
  defaultStatus?: TaskStatus;
  /** When opening from calendar, pre-fill due date / time */
  initialDueDate?: Date | null;
  initialDueTime?: boolean;
  /** Change when opening a new slot so effect re-runs */
  slotKey?: string;
  onClose: () => void;
  className?: string;
}

export function QuickAdd({
  projectId,
  workspaceId,
  defaultStatus = "TODO",
  initialDueDate,
  initialDueTime = false,
  slotKey,
  onClose,
  className,
}: QuickAddProps) {
  const [title, setTitle] = useState("");
  const [detectedDate, setDetectedDate] = useState<Date | null>(null);
  const [cleanTitle, setCleanTitle] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const createTask = useCreateTask();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (initialDueDate) {
      setDetectedDate(initialDueDate);
      setCleanTitle("");
    }
  }, [initialDueDate, slotKey]);

  function parseTitle(raw: string) {
    if (!chrono || !raw.trim()) {
      setDetectedDate(null);
      setCleanTitle(raw);
      return;
    }
    const results = chrono.parse(raw, new Date(), { forwardDate: true });
    if (results.length > 0 && results[0]) {
      const result = results[0];
      const date = result.start.date();
      // Strip the date text from the title
      const stripped = (
        raw.slice(0, result.index) + raw.slice(result.index + result.text.length)
      ).trim().replace(/\s+/g, " ");
      setDetectedDate(date);
      setCleanTitle(stripped || raw);
    } else {
      setDetectedDate(null);
      setCleanTitle(raw);
    }
  }

  function handleChange(value: string) {
    setTitle(value);
    parseTitle(value);
  }

  async function handleSubmit() {
    const finalTitle = (detectedDate ? cleanTitle : title).trim();
    if (!finalTitle) return;
    setSubmitError(null);
    try {
      await createTask.mutateAsync({
        workspaceId,
        projectId: projectId ?? undefined,
        title: finalTitle,
        status: defaultStatus,
        priority: "P4",
        dueDate: detectedDate ?? initialDueDate ?? undefined,
        dueTime: Boolean(initialDueTime && (detectedDate ?? initialDueDate)),
      });
      setTitle("");
      setDetectedDate(null);
      setCleanTitle("");
      onClose();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to create task";
      setSubmitError(msg);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleSubmit();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  return (
    <div
      className={cn(
        "rounded-md border border-primary/40 bg-background shadow-sm mx-3 my-1",
        className,
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40 shrink-0" />
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Task name"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!title.trim() || createTask.isPending}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded transition-colors",
              title.trim()
                ? "text-primary hover:bg-primary/10"
                : "text-muted-foreground/40 cursor-not-allowed",
            )}
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/60 hover:bg-muted/60 hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {detectedDate && (
        <div className="flex items-center gap-1.5 px-3 pb-2">
          <Calendar className="h-3 w-3 text-primary" />
          <span className="text-xs text-primary font-medium">
            {format(detectedDate, "MMM d, yyyy")}
          </span>
          <button
            type="button"
            onClick={() => {
              setDetectedDate(null);
              setCleanTitle(title);
            }}
            className="ml-1 text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      {submitError && (
        <div className="px-3 pb-2 text-xs text-destructive">
          {submitError}
        </div>
      )}
    </div>
  );
}
