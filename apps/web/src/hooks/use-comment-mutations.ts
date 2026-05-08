"use client";

import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { trpc } from "@/lib/trpc/provider";

interface CommentUser {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

interface CommentReaction {
  id: string;
  commentId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
}

interface MentionEntry {
  id: string;
  userId: string;
  user: CommentUser;
}

interface CommentItem {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  isEdited: boolean;
  editedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: CommentUser;
  mentions: MentionEntry[];
  reactions: CommentReaction[];
}

export function useCreateComment() {
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();
  return trpc.comment.create.useMutation({
    onMutate: async (input) => {
      await utils.comment.listByTask.cancel({
        workspaceId: input.workspaceId,
        taskId: input.taskId,
      });

      const key = getQueryKey(trpc.comment.listByTask, {
        workspaceId: input.workspaceId,
        taskId: input.taskId,
      });
      const prev = queryClient.getQueryData<CommentItem[]>(key);
      return { prev };
    },
    onError: (_e, input, ctx) => {
      if (!ctx) return;
      queryClient.setQueryData(
        getQueryKey(trpc.comment.listByTask, {
          workspaceId: input.workspaceId,
          taskId: input.taskId,
        }),
        ctx.prev,
      );
    },
    onSettled: (_d, _e, input) => {
      void utils.comment.listByTask.invalidate({
        workspaceId: input.workspaceId,
        taskId: input.taskId,
      });
      void utils.task.get.invalidate({
        workspaceId: input.workspaceId,
        taskId: input.taskId,
      });
      void utils.notification.list.invalidate();
    },
  });
}

export function useUpdateComment() {
  const utils = trpc.useUtils();
  return trpc.comment.update.useMutation({
    onSettled: () => {
      void utils.comment.listByTask.invalidate();
      void utils.task.get.invalidate();
    },
  });
}

export function useDeleteComment() {
  const utils = trpc.useUtils();
  return trpc.comment.delete.useMutation({
    onSettled: () => {
      void utils.comment.listByTask.invalidate();
      void utils.task.get.invalidate();
    },
  });
}

export function useReactToComment() {
  const utils = trpc.useUtils();
  return trpc.comment.react.useMutation({
    onSettled: () => {
      void utils.comment.listByTask.invalidate();
    },
  });
}

export function useUnreactToComment() {
  const utils = trpc.useUtils();
  return trpc.comment.unreact.useMutation({
    onSettled: () => {
      void utils.comment.listByTask.invalidate();
    },
  });
}
