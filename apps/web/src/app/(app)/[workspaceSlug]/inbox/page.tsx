"use client";

import { Inbox } from "lucide-react";
import { TaskList } from "@/components/tasks/task-list";

export default function InboxPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-border px-6 shrink-0">
        <div className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Inbox</h1>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <TaskList filter="inbox" />
      </div>
    </div>
  );
}
