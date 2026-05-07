"use client";

import { createContext, useContext } from "react";
import { createStore, useStore } from "zustand";
import type { StoreApi } from "zustand";

interface TaskStore {
  selectedTaskId: string | null;
  isDetailOpen: boolean;
  quickAddProjectId: string | null;
  quickAddOpen: boolean;
  commandPaletteOpen: boolean;
  newProjectOpen: boolean;

  setSelectedTaskId: (id: string | null) => void;
  openDetail: (taskId: string) => void;
  closeDetail: () => void;
  setQuickAddProjectId: (projectId: string | null) => void;
  openQuickAdd: () => void;
  closeQuickAdd: () => void;
  toggleCommandPalette: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  openNewProject: () => void;
  closeNewProject: () => void;
}

function createTaskStore() {
  return createStore<TaskStore>((set) => ({
    selectedTaskId: null,
    isDetailOpen: false,
    quickAddProjectId: null,
    quickAddOpen: false,
    commandPaletteOpen: false,
    newProjectOpen: false,

    setSelectedTaskId: (id) => set({ selectedTaskId: id }),

    openDetail: (taskId) =>
      set({ selectedTaskId: taskId, isDetailOpen: true }),

    closeDetail: () =>
      set({ isDetailOpen: false, selectedTaskId: null }),

    setQuickAddProjectId: (projectId) =>
      set({ quickAddProjectId: projectId }),

    openQuickAdd: () => set({ quickAddOpen: true }),

    closeQuickAdd: () => set({ quickAddOpen: false }),

    toggleCommandPalette: () =>
      set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

    openCommandPalette: () => set({ commandPaletteOpen: true }),

    closeCommandPalette: () => set({ commandPaletteOpen: false }),

    openNewProject: () => set({ newProjectOpen: true }),

    closeNewProject: () => set({ newProjectOpen: false }),
  }));
}

const TaskStoreContext = createContext<StoreApi<TaskStore> | null>(null);

export { TaskStoreContext };
export type { TaskStore };
export { createTaskStore };

export function useTaskStore<T>(selector: (state: TaskStore) => T): T {
  const store = useContext(TaskStoreContext);
  if (!store) {
    throw new Error("useTaskStore must be used inside <TaskStoreProvider>");
  }
  return useStore(store, selector);
}
