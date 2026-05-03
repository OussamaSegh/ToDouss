import { CalendarDays } from "lucide-react";

export default function UpcomingPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-border px-6">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Upcoming</h1>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-2">
          <CalendarDays className="h-12 w-12 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground font-medium">No upcoming tasks</p>
          <p className="text-sm text-muted-foreground/70">Tasks due in the next 7 days appear here</p>
        </div>
      </div>
    </div>
  );
}
