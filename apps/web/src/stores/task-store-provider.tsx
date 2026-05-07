"use client";

import { useState, type ReactNode } from "react";
import { TaskStoreContext, createTaskStore } from "./task-store";

export function TaskStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createTaskStore());

  return (
    <TaskStoreContext.Provider value={store}>
      {children}
    </TaskStoreContext.Provider>
  );
}
