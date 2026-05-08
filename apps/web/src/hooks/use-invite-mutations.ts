"use client";

import { trpc } from "@/lib/trpc/provider";

export function useCreateInvite() {
  const utils = trpc.useUtils();
  return trpc.invite.create.useMutation({
    onSettled: (_d, _e, input) => {
      void utils.invite.listPending.invalidate({ workspaceId: input.workspaceId });
      void utils.notification.list.invalidate();
    },
  });
}

export function useResendInvite() {
  const utils = trpc.useUtils();
  return trpc.invite.resend.useMutation({
    onSettled: (_d, _e, input) => {
      void utils.invite.listPending.invalidate({ workspaceId: input.workspaceId });
    },
  });
}

export function useRevokeInvite() {
  const utils = trpc.useUtils();
  return trpc.invite.revoke.useMutation({
    onSettled: (_d, _e, input) => {
      void utils.invite.listPending.invalidate({ workspaceId: input.workspaceId });
    },
  });
}

export function useAcceptInvite() {
  const utils = trpc.useUtils();
  return trpc.invite.accept.useMutation({
    onSettled: () => {
      void utils.workspace.list.invalidate();
      void utils.notification.list.invalidate();
    },
  });
}
