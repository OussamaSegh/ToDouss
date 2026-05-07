"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@todouss/ui";
import { Tag, Plus, Check, X, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/provider";
import { useWorkspace } from "@/lib/workspace-context";

const PALETTE = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  "#94a3b8",
];

interface SelectedLabel {
  id: string;
  name: string;
  color: string;
}

interface LabelMultiSelectProps {
  value: SelectedLabel[];
  onChange: (labelIds: string[]) => void;
  className?: string;
}

export function LabelMultiSelect({ value, onChange, className }: LabelMultiSelectProps) {
  const workspace = useWorkspace();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PALETTE[0]!);
  const ref = useRef<HTMLDivElement>(null);

  const { data: labels } = trpc.label.list.useQuery(
    { workspaceId: workspace.id },
    { enabled: open },
  );
  const utils = trpc.useUtils();
  const createLabel = trpc.label.create.useMutation({
    onSuccess: (created) => {
      void utils.label.list.invalidate({ workspaceId: workspace.id });
      onChange([...value.map((l) => l.id), created.id]);
      setNewName("");
      setCreating(false);
    },
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const selectedIds = new Set(value.map((l) => l.id));

  function toggle(labelId: string) {
    if (selectedIds.has(labelId)) {
      onChange(value.map((l) => l.id).filter((id) => id !== labelId));
    } else {
      onChange([...value.map((l) => l.id), labelId]);
    }
  }

  function handleCreate() {
    if (!newName.trim()) return;
    createLabel.mutate({
      workspaceId: workspace.id,
      name: newName.trim(),
      color: newColor,
    });
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((label) => (
          <span
            key={label.id}
            className="group/chip inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: label.color }}
          >
            {label.name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggle(label.id);
              }}
              className="ml-0.5 -mr-0.5 rounded-full hover:bg-black/20 opacity-70 hover:opacity-100 transition-opacity"
              aria-label={`Remove ${label.name}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs",
            "text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors",
          )}
        >
          <Tag className="h-3 w-3" />
          {value.length === 0 ? "Add label" : "Edit"}
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-60 rounded-md border border-border bg-popover shadow-md py-1">
          <div className="max-h-56 overflow-y-auto">
            {labels?.map((label) => {
              const selected = selectedIds.has(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => toggle(label.id)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/60 transition-colors"
                >
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="flex-1 text-left text-foreground truncate">{label.name}</span>
                  {selected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
            {labels?.length === 0 && !creating && (
              <p className="px-3 py-3 text-center text-xs text-muted-foreground">
                No labels yet
              </p>
            )}
          </div>

          <div className="border-t border-border mt-1 pt-1">
            {creating ? (
              <div className="px-2 py-1.5 space-y-2">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreate();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setCreating(false);
                      setNewName("");
                    }
                  }}
                  placeholder="Label name"
                  className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex items-center gap-1.5">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={cn(
                        "h-4 w-4 rounded-full transition-transform",
                        newColor === c && "ring-2 ring-offset-1 ring-foreground/40 scale-110",
                      )}
                      style={{ backgroundColor: c }}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={!newName.trim() || createLabel.isPending}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {createLabel.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreating(false);
                      setNewName("");
                    }}
                    className="rounded border border-border px-2 py-1 text-xs hover:bg-muted/60 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Create label
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
