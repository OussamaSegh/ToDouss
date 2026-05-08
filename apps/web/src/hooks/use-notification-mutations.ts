"use client";

import { trpc } from "@/lib/trpc/provider";

export function useMarkNotificationRead() {
  const utils = trpc.useUtils();
  return trpc.notification.markRead.useMutation({
    onSettled: () => {
      void utils.notification.list.invalidate();
    },
  });
}

export function useMarkAllNotificationsRead() {
  const utils = trpc.useUtils();
  return trpc.notification.markAllRead.useMutation({
    onSettled: () => {
      void utils.notification.list.invalidate();
    },
  });
}
