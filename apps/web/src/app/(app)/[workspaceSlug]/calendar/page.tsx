"use client";

import { UiIcon } from "@todouss/ui";
import { PageHeader } from "@/components/shared/page-header";
import { PageContainer } from "@/components/shared/page-container";
import { CalendarView } from "@/components/tasks/calendar-view";

export default function WorkspaceCalendarPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Calendar"
        icon={<UiIcon name="calendar" className="h-5 w-5 text-muted-foreground" />}
      />
      <div className="flex-1 overflow-auto">
        <PageContainer className="max-w-none p-0">
          <CalendarView />
        </PageContainer>
      </div>
    </div>
  );
}
