"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { cn } from "@todouss/ui";
import {
  Inbox,
  Sun,
  CalendarDays,
  Plus,
  Folder,
  X,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useTaskStore } from "@/stores/task-store";
import { useWorkspace } from "@/lib/workspace-context";
import { trpc } from "@/lib/trpc/provider";

export function CommandPalette() {
  const router = useRouter();
  const workspace = useWorkspace();
  const {
    commandPaletteOpen,
    closeCommandPalette,
    openCommandPalette,
    openNewProject,
  } = useTaskStore(
    useShallow((s) => ({
      commandPaletteOpen: s.commandPaletteOpen,
      closeCommandPalette: s.closeCommandPalette,
      openCommandPalette: s.openCommandPalette,
      openNewProject: s.openNewProject,
    })),
  );

  const { data: projectsData } = trpc.project.list.useQuery(
    { workspaceId: workspace.id },
    { enabled: commandPaletteOpen },
  );

  // Global keyboard shortcut
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      if (modifier && e.key === "k") {
        e.preventDefault();
        if (commandPaletteOpen) {
          closeCommandPalette();
        } else {
          openCommandPalette();
        }
      }
      if (e.key === "Escape" && commandPaletteOpen) {
        closeCommandPalette();
      }
    },
    [commandPaletteOpen, closeCommandPalette, openCommandPalette],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!commandPaletteOpen) return null;

  function navigate(path: string) {
    closeCommandPalette();
    router.push(path);
  }

  const slug = workspace.slug;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={closeCommandPalette}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Command dialog */}
      <div
        className="relative z-10 w-full max-w-[560px] rounded-xl border border-border bg-popover shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="[&_[cmdk-input]]:h-12 [&_[cmdk-input]]:border-0 [&_[cmdk-input]]:outline-none [&_[cmdk-input]]:bg-transparent [&_[cmdk-input]]:px-4 [&_[cmdk-input]]:text-sm [&_[cmdk-input]]:text-foreground [&_[cmdk-input]]:placeholder:text-muted-foreground">
          <div className="flex items-center border-b border-border">
            <Command.Input placeholder="Search or jump to…" className="flex-1" />
            <button
              type="button"
              onClick={closeCommandPalette}
              className="mr-2 flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted/60 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {/* Navigation */}
            <Command.Group
              heading="Navigation"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              <CommandItem
                icon={<Inbox className="h-4 w-4" />}
                label="Inbox"
                onSelect={() => navigate(`/${slug}/inbox`)}
              />
              <CommandItem
                icon={<Sun className="h-4 w-4" />}
                label="Today"
                onSelect={() => navigate(`/${slug}/today`)}
              />
              <CommandItem
                icon={<CalendarDays className="h-4 w-4" />}
                label="Upcoming"
                onSelect={() => navigate(`/${slug}/upcoming`)}
              />
            </Command.Group>

            {/* Projects */}
            {projectsData && projectsData.length > 0 && (
              <Command.Group
                heading="Projects"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {projectsData
                  .filter((p) => !p.isInbox)
                  .map((project) => (
                    <CommandItem
                      key={project.id}
                      icon={
                        <div
                          className="h-3.5 w-3.5 rounded-sm shrink-0"
                          style={{ backgroundColor: project.color }}
                        />
                      }
                      label={project.name}
                      onSelect={() => navigate(`/${slug}/projects/${project.id}`)}
                    />
                  ))}
              </Command.Group>
            )}

            {/* Actions */}
            <Command.Group
              heading="Actions"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              <CommandItem
                icon={<Plus className="h-4 w-4" />}
                label="Create task"
                onSelect={() => {
                  closeCommandPalette();
                  // Defer so the palette unmount completes before TaskList consumes
                  setTimeout(
                    () => document.dispatchEvent(new CustomEvent("todouss:quick-add")),
                    0,
                  );
                }}
              />
              <CommandItem
                icon={<Folder className="h-4 w-4" />}
                label="Create project"
                onSelect={() => {
                  closeCommandPalette();
                  openNewProject();
                }}
              />
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function CommandItem({
  icon,
  label,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={label}
      onSelect={onSelect}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm cursor-pointer",
        "text-foreground transition-colors",
        "aria-selected:bg-accent aria-selected:text-accent-foreground",
        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground",
      )}
    >
      <span className="text-muted-foreground shrink-0">{icon}</span>
      {label}
    </Command.Item>
  );
}
