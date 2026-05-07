"use client";

import { useEffect, useState } from "react";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/provider";
import { useWorkspace } from "@/lib/workspace-context";
import { TaskItem } from "@/components/tasks/task-item";

export default function SearchPage() {
  const workspace = useWorkspace();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(id);
  }, [query]);

  const enabled = debounced.length >= 2;
  const { data, isFetching } = trpc.task.list.useQuery(
    { workspaceId: workspace.id, search: debounced, limit: 50 },
    { enabled, staleTime: 5_000 },
  );

  const tasks = data?.tasks.filter((t) => !t.parentTaskId) ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-border px-6 shrink-0">
        <div className="flex items-center gap-2">
          <SearchIcon className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Search</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-6">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks…"
              className="w-full rounded-md border border-input bg-background pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {isFetching && enabled && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          <div className="mt-6">
            {!enabled ? (
              <p className="text-center text-sm text-muted-foreground py-12">
                Type at least two characters to search.
              </p>
            ) : tasks.length === 0 && !isFetching ? (
              <p className="text-center text-sm text-muted-foreground py-12">
                No tasks match &ldquo;{debounced}&rdquo;.
              </p>
            ) : (
              <div className="space-y-0.5">
                {tasks.map((task) => (
                  <TaskItem key={task.id} task={task} workspaceId={workspace.id} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
