import { z } from "zod";

export const listCommentsSchema = z.object({
  workspaceId: z.string().cuid(),
  taskId: z.string().cuid(),
});

export const createCommentSchema = z.object({
  workspaceId: z.string().cuid(),
  taskId: z.string().cuid(),
  body: z.string().min(1, "Comment cannot be empty").max(10_000),
});

export const updateCommentSchema = z.object({
  workspaceId: z.string().cuid(),
  commentId: z.string().cuid(),
  body: z.string().min(1, "Comment cannot be empty").max(10_000),
});

export const deleteCommentSchema = z.object({
  workspaceId: z.string().cuid(),
  commentId: z.string().cuid(),
});

export const reactToCommentSchema = z.object({
  workspaceId: z.string().cuid(),
  commentId: z.string().cuid(),
  emoji: z.string().min(1).max(24),
});

export const unreactToCommentSchema = reactToCommentSchema;

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
