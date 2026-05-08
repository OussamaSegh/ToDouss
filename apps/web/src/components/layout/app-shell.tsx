"use client";

import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { cn, UiButton, UiIcon } from "@todouss/ui";
import type { WorkspaceData, ProjectData, UserData } from "@/types/workspace";
import { WorkspaceProvider, useWorkspace } from "@/lib/workspace-context";
import { TaskStoreProvider } from "@/stores/task-store-provider";
import { Sidebar } from "./sidebar/sidebar";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useWorkspaceRealtime } from "@/hooks/use-workspace-realtime";
import { featureFlags } from "@/lib/feature-flags";
import { InstallAppPrompt } from "@/components/shared/install-app-prompt";

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
  children: ReactNode;
}

function MobileNavBar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const ws = useWorkspace();
  return (
    <header
      className="flex md:hidden shrink-0 h-11 items-center gap-2 border-b border-border bg-[var(--surface-base)] px-2 text-foreground"
    >
      <UiButton
        type="button"
        variant="ghost"
        size="sm"
        className="h-9 w-9 shrink-0 px-0"
        onClick={onOpenSidebar}
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </UiButton>
      <UiIcon name={featureFlags.uiIconV2 ? "workspace" : "project"} className="h-4 w-4 text-primary shrink-0" />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{ws.name}</span>
    </header>
  );
}

function AppShellInner({
  workspace,
  projects,
  workspaces,
  currentUser,
  children,
}: AppShellProps) {
  useKeyboardShortcuts();
  useWorkspaceRealtime(workspace.id);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  function closeSidebar() {
    setMobileSidebarOpen(false);
  }

  return (
    <div className="flex h-full flex-col md:flex-row overflow-hidden bg-[var(--surface-base)]">
      <MobileNavBar onOpenSidebar={() => setMobileSidebarOpen(true)} />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {mobileSidebarOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-[60] bg-black/40 md:hidden"
            aria-label="Close sidebar"
            onClick={closeSidebar}
          />
        ) : null}

        <Sidebar
          workspace={workspace}
          projects={projects}
          workspaces={workspaces}
          currentUser={currentUser}
          onNavigate={closeSidebar}
          className={cn(
            "max-md:fixed max-md:left-0 max-md:top-11 max-md:bottom-0 max-md:z-[70] motion-safe:max-md:transition-transform motion-safe:max-md:duration-200 motion-safe:ease-out",
            mobileSidebarOpen ? "max-md:translate-x-0 max-md:pointer-events-auto" : "max-md:pointer-events-none max-md:-translate-x-full",
            "md:relative md:inset-auto md:z-auto md:translate-x-0 md:pointer-events-auto md:h-full",
          )}
        />

        <main
          className={
            featureFlags.uiShellRefresh
              ? "flex-1 min-w-0 min-h-0 overflow-auto bg-[var(--surface-base)]"
              : "flex-1 min-h-0 min-w-0 overflow-auto"
          }
        >
          {children}
        </main>
      </div>

      <TaskDetailPanel />
      <CommandPalette />
      <NewProjectDialog />
      <InstallAppPrompt />
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
