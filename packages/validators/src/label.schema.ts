import { z } from "zod";

export const createLabelSchema = z.object({
  workspaceId: z.string().cuid(),
  name: z.string().min(1, "Label name is required").max(48),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#94a3b8"),
});

export const updateLabelSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(48).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  sortOrder: z.number().int().optional(),
});

export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
