"use client";

import { Sun } from "lucide-react";
import { TaskList } from "@/components/tasks/task-list";

export default function TodayPage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-border px-6 shrink-0">
        <div className="flex items-center gap-2">
          <Sun className="h-5 w-5 text-amber-500" />
          <h1 className="text-lg font-semibold">Today</h1>
          <span className="text-sm text-muted-foreground ml-2">{today}</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <TaskList filter="today" />
      </div>
    </div>
  );
}
