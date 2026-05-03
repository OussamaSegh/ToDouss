"use client";

import type { WorkspaceData, ProjectData, UserData } from "@/types/workspace";
import { Sidebar } from "./sidebar/sidebar";

interface AppShellProps {
  workspace: WorkspaceData;
  projects: ProjectData[];
  workspaces: WorkspaceData[];
  currentUser: UserData;
  children: React.ReactNode;
}

export function AppShell({ workspace, projects, workspaces, currentUser, children }: AppShellProps) {
  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar
        workspace={workspace}
        projects={projects}
        workspaces={workspaces}
        currentUser={currentUser}
      />
      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
