"use client";

import dynamic from "next/dynamic";
import type { WorkspaceData, ProjectData, UserData } from "@/types/workspace";
import { WorkspaceProvider } from "@/lib/workspace-context";
import { TaskStoreProvider } from "@/stores/task-store-provider";
import { Sidebar } from "./sidebar/sidebar";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

// Disable SSR for components that use global Zustand stores.
// Zustand's useSyncExternalStore getServerSnapshot is not stable across
// concurrent server renders in Next.js App Router, so we render these
// purely on the client to avoid the infinite-loop hydration error.
const TaskDetailPanel = dynamic(
  () => import("@/components/tasks/task-detail").then((m) => m.TaskDetailPanel),
  { ssr: false },
);
const CommandPalette = dynamic(
  () => import("@/components/shared/command-palette").then((m) => m.CommandPalette),
  { ssr: false },
);
const NewProjectDialog = dynamic(
  () => import("@/components/projects/new-project-dialog").then((m) => m.NewProjectDialog),
  { ssr: false },
);

interface AppShellProps {
  workspace: WorkspaceData;
  projects: ProjectData[];
  workspaces: WorkspaceData[];
  currentUser: UserData;
  children: React.ReactNode;
}

function AppShellInner({
  workspace,
  projects,
  workspaces,
  currentUser,
  children,
}: AppShellProps) {
  useKeyboardShortcuts();

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

      {/* Global overlays — client-only, mounted after hydration */}
      <TaskDetailPanel />
      <CommandPalette />
      <NewProjectDialog />
    </div>
  );
}

export function AppShell(props: AppShellProps) {
  return (
    <WorkspaceProvider value={props.workspace}>
      <TaskStoreProvider>
        <AppShellInner {...props} />
      </TaskStoreProvider>
    </WorkspaceProvider>
  );
}
