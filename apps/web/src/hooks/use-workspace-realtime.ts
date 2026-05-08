"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { trpc } from "@/lib/trpc/provider";
import { getPusherClient } from "@/lib/pusher/client";

interface WorkspaceRealtimeEvent {
  actorId?: string;
  workspaceId?: string;
  updatedAt?: string;
}

export function useWorkspaceRealtime(workspaceId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(`workspace-${workspaceId}`);
    let latestEventTs = 0;

    const onAnyMutation = (evt: WorkspaceRealtimeEvent) => {
      if (!evt.workspaceId || evt.workspaceId !== workspaceId) return;
      if (evt.updatedAt) {
        const ts = new Date(evt.updatedAt).getTime();
        if (Number.isFinite(ts) && ts < latestEventTs) return;
        latestEventTs = ts;
      }
      // Broad invalidation keeps clients in sync while we expand granular handlers.
      void queryClient.invalidateQueries({ queryKey: getQueryKey(trpc.notification.list) });
      void queryClient.invalidateQueries({ queryKey: getQueryKey(trpc.task.get) });
      void queryClient.invalidateQueries({ queryKey: getQueryKey(trpc.task.list) });
      void queryClient.invalidateQueries({ queryKey: getQueryKey(trpc.task.calendarRange) });
      void queryClient.invalidateQueries({ queryKey: getQueryKey(trpc.task.timelineRange) });
      void queryClient.invalidateQueries({ queryKey: getQueryKey(trpc.task.tableList) });
      void queryClient.invalidateQueries({ queryKey: getQueryKey(trpc.savedView.list) });
      void queryClient.invalidateQueries({ queryKey: getQueryKey(trpc.comment.listByTask) });
      void queryClient.invalidateQueries({ queryKey: getQueryKey(trpc.invite.listPending) });
    };

    channel.bind("notification.created", onAnyMutation);
    channel.bind("invite.created", onAnyMutation);
    channel.bind("invite.resent", onAnyMutation);
    channel.bind("invite.revoked", onAnyMutation);
    channel.bind("invite.accepted", onAnyMutation);

    return () => {
      channel.unbind("notification.created", onAnyMutation);
      channel.unbind("invite.created", onAnyMutation);
      channel.unbind("invite.resent", onAnyMutation);
      channel.unbind("invite.revoked", onAnyMutation);
      channel.unbind("invite.accepted", onAnyMutation);
      pusher.unsubscribe(`workspace-${workspaceId}`);
    };
  }, [workspaceId, queryClient]);
}
