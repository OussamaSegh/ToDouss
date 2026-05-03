import { Sun } from "lucide-react";

export default function TodayPage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-border px-6">
        <div className="flex items-center gap-2">
          <Sun className="h-5 w-5 text-amber-500" />
          <h1 className="text-lg font-semibold">Today</h1>
          <span className="text-sm text-muted-foreground ml-2">{today}</span>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-2">
          <Sun className="h-12 w-12 text-amber-400/40 mx-auto" />
          <p className="text-muted-foreground font-medium">Nothing due today</p>
          <p className="text-sm text-muted-foreground/70">Enjoy your clear schedule!</p>
        </div>
      </div>
    </div>
  );
}
