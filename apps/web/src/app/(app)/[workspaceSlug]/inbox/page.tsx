import { Inbox } from "lucide-react";

export default function InboxPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-border px-6">
        <div className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Inbox</h1>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-2">
          <Inbox className="h-12 w-12 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground font-medium">Your inbox is empty</p>
          <p className="text-sm text-muted-foreground/70">Tasks without a project land here</p>
        </div>
      </div>
    </div>
  );
}
