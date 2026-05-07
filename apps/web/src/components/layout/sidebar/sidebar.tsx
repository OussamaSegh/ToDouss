"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  Inbox,
  Sun,
  CalendarDays,
  Search,
  Settings,
  Plus,
  ChevronDown,
  Folder,
} from "lucide-react";
import type { WorkspaceData, ProjectData, UserData } from "@/types/workspace";
import { useTaskStore } from "@/stores/task-store";
import { trpc } from "@/lib/trpc/provider";

interface SidebarProps {
  workspace: WorkspaceData;
  projects: ProjectData[];
  workspaces: WorkspaceData[];
  currentUser: UserData;
}

const NAV_ITEMS = (slug: string) => [
  { href: `/${slug}/inbox`, icon: Inbox, label: "Inbox" },
  { href: `/${slug}/today`, icon: Sun, label: "Today" },
  { href: `/${slug}/upcoming`, icon: CalendarDays, label: "Upcoming" },
  { href: `/${slug}/search`, icon: Search, label: "Search" },
];

export function Sidebar({ workspace, projects: initialProjects, currentUser }: SidebarProps) {
  const pathname = usePathname();
  const openNewProject = useTaskStore((s) => s.openNewProject);

  // Subscribe to live project list so the sidebar reflects optimistic creates
  const { data: liveProjects } = trpc.project.list.useQuery(
    { workspaceId: workspace.id },
    { initialData: initialProjects },
  );
  const projects = liveProjects ?? initialProjects;

  return (
    <aside className="flex h-full w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shrink-0">
      {/* Workspace header */}
      <div className="flex h-12 items-center justify-between px-3 border-b border-sidebar-border">
        <button className="flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold hover:bg-accent transition-colors min-w-0">
          <div
            className="h-5 w-5 rounded flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: "#6366f1" }}
          >
            {workspace.name.charAt(0).toUpperCase()}
          </div>
          <span className="truncate">{workspace.name}</span>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {NAV_ITEMS(workspace.slug).map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
              pathname === href
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}

        {/* Projects section */}
        <div className="pt-4">
          <div className="flex items-center justify-between px-2.5 mb-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Projects
            </span>
            <button
              type="button"
              onClick={openNewProject}
              title="Create project"
              className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {projects
            .filter((p) => !p.isInbox)
            .map((project) => (
              <Link
                key={project.id}
                href={`/${workspace.slug}/projects/${project.id}`}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                  pathname.startsWith(`/${workspace.slug}/projects/${project.id}`)
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <div
                  className="h-3.5 w-3.5 rounded-sm shrink-0"
                  style={{ backgroundColor: project.color }}
                />
                <span className="truncate">{project.name}</span>
              </Link>
            ))}

          {projects.filter((p) => !p.isInbox).length === 0 && (
            <div className="px-2.5 py-3 text-center">
              <Folder className="h-8 w-8 text-muted-foreground/40 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">No projects yet</p>
            </div>
          )}
        </div>
      </nav>

      {/* Bottom: user + settings */}
      <div className="p-2 border-t border-sidebar-border space-y-0.5">
        <Link
          href={`/${workspace.slug}/settings`}
          className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Settings className="h-4 w-4 shrink-0" />
          Settings
        </Link>
        <div className="flex items-center gap-2.5 px-2.5 py-1.5">
          <UserButton
            appearance={{ elements: { avatarBox: "h-6 w-6" } }}
          />
          <span className="text-sm text-muted-foreground truncate">
            {currentUser.name ?? currentUser.email}
          </span>
        </div>
      </div>
    </aside>
  );
}
