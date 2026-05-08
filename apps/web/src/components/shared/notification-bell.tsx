"use client";

import { useState } from "react";
import { useEffect } from "react";
import { Bell } from "lucide-react";
import { trpc } from "@/lib/trpc/provider";
import { useMarkAllNotificationsRead, useMarkNotificationRead } from "@/hooks/use-notification-mutations";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = trpc.notification.list.useQuery(
    { limit: 20 },
    { enabled: open, refetchInterval: open ? 20_000 : false },
  );
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  useEffect(() => {
    function openPanel() {
      setOpen(true);
    }
    document.addEventListener("todouss:open-notifications", openPanel as EventListener);
    return () =>
      document.removeEventListener(
        "todouss:open-notifications",
        openPanel as EventListener,
      );
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-2 hover:bg-accent"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-96 rounded-md border border-border bg-popover shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-semibold">Notifications</p>
            <button
              type="button"
              onClick={() => markAllRead.mutate({})}
              className="text-xs text-primary hover:underline"
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-auto">
            {isLoading && <p className="p-3 text-sm text-muted-foreground">Loading...</p>}
            {!isLoading && notifications.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">No notifications yet</p>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => !n.readAt && markRead.mutate({ notificationId: n.id })}
                className={`block w-full border-b border-border px-3 py-2 text-left hover:bg-muted/50 ${
                  n.readAt ? "" : "bg-primary/5"
                }`}
              >
                <p className="text-sm font-medium">{n.title}</p>
                {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
