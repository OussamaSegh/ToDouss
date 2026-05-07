"use client";

import { useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@todouss/ui";
import { Loader2, Lock, X } from "lucide-react";
import { useTaskStore } from "@/stores/task-store";
import { useWorkspace } from "@/lib/workspace-context";
import { useCreateProject } from "@/hooks/use-project-mutations";

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#10b981", "#06b6d4", "#3b82f6", "#6366f1",
  "#8b5cf6", "#ec4899", "#f43f5e", "#94a3b8",
];

function NewProjectForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const workspace = useWorkspace();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[7]!);
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState("");

  const createProject = useCreateProject();

  async function handleCreate() {
    setError("");
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      const project = await createProject.mutateAsync({
        workspaceId: workspace.id,
        name: trimmed,
        color: color.toLowerCase(),
        icon: "folder",
        isPrivate,
      });
      onClose();
      router.push(`/${workspace.slug}/projects/${project.id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create project";
      setError(msg);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleCreate();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">New project</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted/60 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium block mb-1.5 text-muted-foreground">
            Name
          </label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Marketing site, Q4 planning…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="text-xs font-medium block mb-1.5 text-muted-foreground">
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  "h-6 w-6 rounded-md transition-transform",
                  color === c && "ring-2 ring-offset-2 ring-foreground/40 scale-110",
                )}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsPrivate((p) => !p)}
          className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
        >
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex-1 text-left">
            <p className="text-foreground">Private project</p>
            <p className="text-xs text-muted-foreground">
              Only invited members can access
            </p>
          </div>
          <span
            className={cn(
              "h-5 w-9 rounded-full transition-colors relative shrink-0",
              isPrivate ? "bg-primary" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-all",
                isPrivate ? "left-4" : "left-0.5",
              )}
            />
          </span>
        </button>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted/40 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!name.trim() || createProject.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {createProject.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create project
          </button>
        </div>
      </div>
    </>
  );
}

export function NewProjectDialog() {
  const { open, close } = useTaskStore(
    useShallow((s) => ({
      open: s.newProjectOpen,
      close: s.closeNewProject,
    })),
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="new-project-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[80] flex items-start justify-center pt-[18vh] bg-black/40 backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            key="new-project-card"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-border bg-popover shadow-2xl p-5"
          >
            <NewProjectForm onClose={close} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
