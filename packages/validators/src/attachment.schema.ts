import { z } from "zod";

export const attachmentPrepareSchema = z.object({
  workspaceId: z.string().cuid(),
  taskId: z.string().cuid(),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(127),
  sizeBytes: z.number().int().positive().max(100 * 1024 * 1024),
});

export const attachmentCompleteSchema = attachmentPrepareSchema.extend({
  key: z.string().min(1).max(512),
});

export const attachmentDeleteSchema = z.object({
  workspaceId: z.string().cuid(),
  attachmentId: z.string().cuid(),
});
