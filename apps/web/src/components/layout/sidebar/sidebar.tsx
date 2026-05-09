"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Check, ChevronDown, Plus } from "lucide-react";
import { cn, ProjectIcon, UiButton, UiIcon, UiSurface } from "@todouss/ui";
import type { WorkspaceData, ProjectData, UserData } from "@/types/workspace";
import { useTaskStore } from "@/stores/task-store";
import { trpc } from "@/lib/trpc/provider";
import { NotificationBell } from "@/components/shared/notification-bell";
import { featureFlags } from "@/lib/feature-flags";

interface SidebarProps {
  workspace: WorkspaceData;
  projects: ProjectData[];
  workspaces: WorkspaceData[];
  currentUser: UserData;
  className?: string;
  onNavigate?: () => void;
}

function navItemsForWorkspace(slug: string) {
  const items: { href: string; icon: "inbox" | "today" | "upcoming" | "search" | "calendar"; label: string }[] = [
    { href: `/${slug}/inbox`, icon: "inbox", label: "Inbox" },
    { href: `/${slug}/today`, icon: "today", label: "Today" },
    { href: `/${slug}/upcoming`, icon: "upcoming", label: "Upcoming" },
  ];
  if (featureFlags.calendarView) {
    items.push({ href: `/${slug}/calendar`, icon: "calendar", label: "Calendar" });
  }
  items.push({ href: `/${slug}/search`, icon: "search", label: "Search" });
  return items;
}

export function Sidebar({
  workspace,
  projects: initialProjects,
  workspaces,
  currentUser,
  className,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const openNewProject = useTaskStore((s) => s.openNewProject);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);

  const { data: liveProjects } = trpc.project.list.useQuery(
    { workspaceId: workspace.id },
    { initialData: initialProjects },
  );
  const projects = liveProjects ?? initialProjects;

  useEffect(() => {
    if (!workspaceMenuOpen) return;
    function onDocMouseDown(e: MouseEvent) {
      if (workspaceMenuRef.current && !workspaceMenuRef.current.contains(e.target as Node)) {
        setWorkspaceMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [workspaceMenuOpen]);

  const sortedWorkspaces = [...workspaces].sort((a, b) => a.name.localeCompare(b.name));

  function goWorkspace(ws: WorkspaceData) {
    setWorkspaceMenuOpen(false);
    onNavigate?.();
    if (ws.slug !== workspace.slug) {
      router.push(`/${ws.slug}/inbox`);
    }
  }

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shrink-0",
        className,
      )}
    >
      {/* Workspace header */}
      <div className="relative flex h-12 items-center gap-2 px-3 border-b border-sidebar-border">
        <div ref={workspaceMenuRef} className="relative min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setWorkspaceMenuOpen((v) => !v)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold hover:bg-accent transition-colors min-w-0 text-left",
              workspaceMenuOpen && "bg-accent",
            )}
            aria-expanded={workspaceMenuOpen}
            aria-haspopup="listbox"
          >
            <UiIcon
              name={featureFlags.uiIconV2 ? "workspace" : "project"}
              className="h-4 w-4 text-primary shrink-0"
            />
            <span className="truncate">{workspace.name}</span>
            <ChevronDown
              className={cn(
                "h-3 w-3 shrink-0 text-muted-foreground ml-auto motion-safe:transition-transform",
                workspaceMenuOpen && "rotate-180",
              )}
            />
          </button>
          {workspaceMenuOpen && sortedWorkspaces.length > 0 && (
            <ul
              className={cn(
                "absolute left-2 right-2 top-full z-50 mt-1 max-h-[min(280px,calc(100vh-96px))] overflow-auto rounded-md border border-border bg-popover py-1 shadow-lg",
              )}
              role="listbox"
            >
              {sortedWorkspaces.map((ws) => (
                <li key={ws.id} role="option" aria-selected={ws.id === workspace.id}>
                  <button
                    type="button"
                    onClick={() => goWorkspace(ws)}
                    className={cn(
                      "flex w-full items-center gap-2 px-2.5 py-2 text-sm text-left hover:bg-accent",
                      ws.slug === workspace.slug && "bg-accent/60 font-medium",
                    )}
                  >
                    <span className="truncate flex-1">{ws.name}</span>
                    <span className="text-muted-foreground text-xs truncate max-w-[4.5rem]">{ws.slug}</span>
                    {ws.slug === workspace.slug ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" /> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <NotificationBell />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {navItemsForWorkspace(workspace.slug).map(({ href, icon, label }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
              pathname === href
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <UiIcon name={icon} className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}

        <div className="pt-4">
          <div className="flex items-center justify-between px-2.5 mb-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Projects
            </span>
            <UiButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={openNewProject}
              title="Create project"
              className="h-6 w-6 px-0"
            >
              <Plus className="h-3.5 w-3.5" />
            </UiButton>
          </div>

          {projects
            .filter((p) => !p.isInbox)
            .map((project) => (
              <Link
                key={project.id}
                href={`/${workspace.slug}/projects/${project.id}`}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                  pathname.startsWith(`/${workspace.slug}/projects/${project.id}`)
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <ProjectIcon color={project.color} name={project.name} className="h-3.5 w-3.5 text-[8px]" />
                <span className="truncate">{project.name}</span>
              </Link>
            ))}

          {projects.filter((p) => !p.isInbox).length === 0 && (
            <div className="px-2.5 py-3 text-center">
              <UiIcon name="project" className="h-8 w-8 text-muted-foreground/40 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">No projects yet</p>
            </div>
          )}
        </div>
      </nav>

      <UiSurface className="rounded-none border-x-0 border-b-0 p-2 space-y-0.5">
        <Link
          href={`/${workspace.slug}/settings`}
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <UiIcon name="settings" className="h-4 w-4 shrink-0" />
          Settings
        </Link>
        <div className="flex items-center gap-2.5 px-2.5 py-1.5">
          <UserButton appearance={{ elements: { avatarBox: "h-6 w-6" } }} />
          <span className="text-sm text-muted-foreground truncate">
            {currentUser.name ?? currentUser.email}
          </span>
        </div>
      </UiSurface>
    </aside>
  );
}
