"use client";

import { createContext, useContext } from "react";
import type { WorkspaceData } from "@/types/workspace";

const WorkspaceContext = createContext<WorkspaceData | null>(null);

export const WorkspaceProvider = WorkspaceContext.Provider;

export function useWorkspace(): WorkspaceData {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
