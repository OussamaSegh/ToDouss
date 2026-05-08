"use client";

import { useEffect } from "react";
import { useTaskStore } from "@/stores/task-store";
import { useUpdateTask, useDeleteTask } from "@/hooks/use-task-mutations";
import { useWorkspace } from "@/lib/workspace-context";
import type { TaskStatus } from "@/components/shared/status-select";
import type { Priority } from "@/components/shared/priority-badge";

function isInputActive(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    (el as HTMLElement).isContentEditable
  );
}

const STATUS_BY_NUMBER: Record<string, TaskStatus> = {
  "1": "TODO",
  "2": "IN_PROGRESS",
  "3": "IN_REVIEW",
  "4": "DONE",
  "5": "CANCELLED",
};

const PRIORITY_BY_NUMBER: Record<string, Priority> = {
  "1": "P1",
  "2": "P2",
  "3": "P3",
  "4": "P4",
};

export function useKeyboardShortcuts() {
  const workspace = useWorkspace();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const selectedTaskId = useTaskStore((s) => s.selectedTaskId);
  const isDetailOpen = useTaskStore((s) => s.isDetailOpen);
  const closeDetail = useTaskStore((s) => s.closeDetail);
  const toggleCommandPalette = useTaskStore((s) => s.toggleCommandPalette);
  const closeCommandPalette = useTaskStore((s) => s.closeCommandPalette);
  const openCommandPalette = useTaskStore((s) => s.openCommandPalette);
  const commandPaletteOpen = useTaskStore((s) => s.commandPaletteOpen);
  const openNewProject = useTaskStore((s) => s.openNewProject);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // ⌘K / Ctrl+K — command palette (also handled in CommandPalette but kept here)
      if (modifier && e.key === "k") {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      // Escape — close panels
      if (e.key === "Escape") {
        if (commandPaletteOpen) {
          closeCommandPalette();
          return;
        }
        if (isDetailOpen) {
          closeDetail();
        }
        return;
      }

      if (isInputActive()) return;

      // ? — shortcuts / command palette (Shift+/ on US layouts)
      if (e.key === "?") {
        e.preventDefault();
        openCommandPalette();
        return;
      }

      // q — quick add
      if (e.key === "q") {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("todouss:quick-add"));
        return;
      }

      // p — new project
      if (e.key === "p") {
        e.preventDefault();
        openNewProject();
        return;
      }

      // c — focus comment composer in open task detail
      if (e.key === "c" && isDetailOpen) {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("todouss:focus-comment"));
        return;
      }

      // n — open notifications panel
      if (e.key === "n") {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("todouss:open-notifications"));
        return;
      }

      // 1-5 set status on the open task
      if (isDetailOpen && selectedTaskId && STATUS_BY_NUMBER[e.key] && !e.shiftKey) {
        e.preventDefault();
        updateTask.mutate({
          id: selectedTaskId,
          workspaceId: workspace.id,
          status: STATUS_BY_NUMBER[e.key]!,
        });
        return;
      }

      // Shift+1..4 set priority
      if (isDetailOpen && selectedTaskId && e.shiftKey && PRIORITY_BY_NUMBER[e.key]) {
        e.preventDefault();
        updateTask.mutate({
          id: selectedTaskId,
          workspaceId: workspace.id,
          priority: PRIORITY_BY_NUMBER[e.key]!,
        });
        return;
      }

      // Backspace / Delete — delete the open task (with confirm)
      if (
        isDetailOpen &&
        selectedTaskId &&
        (e.key === "Backspace" || e.key === "Delete")
      ) {
        e.preventDefault();
        if (window.confirm("Delete this task?")) {
          deleteTask.mutate({ workspaceId: workspace.id, taskId: selectedTaskId });
          closeDetail();
        }
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    closeDetail,
    toggleCommandPalette,
    closeCommandPalette,
    openCommandPalette,
    commandPaletteOpen,
    isDetailOpen,
    selectedTaskId,
    openNewProject,
    updateTask,
    deleteTask,
    workspace.id,
  ]);
}
