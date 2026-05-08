"use client";

import { UiIcon } from "@todouss/ui";
import { PageHeader } from "@/components/shared/page-header";
import { PageContainer } from "@/components/shared/page-container";
import { TaskList } from "@/components/tasks/task-list";

export default function TodayPage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Today"
        subtitle={today}
        icon={<UiIcon name="today" className="h-5 w-5 text-amber-500" />}
      />
      <div className="flex-1 overflow-auto">
        <PageContainer>
          <TaskList filter="today" />
        </PageContainer>
      </div>
    </div>
  );
}
