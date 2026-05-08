"use client";

import { UiIcon } from "@todouss/ui";
import { PageHeader } from "@/components/shared/page-header";
import { PageContainer } from "@/components/shared/page-container";
import { TaskList } from "@/components/tasks/task-list";

export default function UpcomingPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Upcoming" icon={<UiIcon name="upcoming" className="h-5 w-5 text-muted-foreground" />} />
      <div className="flex-1 overflow-auto">
        <PageContainer>
          <TaskList filter="upcoming" />
        </PageContainer>
      </div>
    </div>
  );
}
