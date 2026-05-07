import { z } from "zod";

export const createSectionSchema = z.object({
  workspaceId: z.string().cuid(),
  projectId: z.string().cuid(),
  name: z.string().min(1, "Section name is required").max(64),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const updateSectionSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(64).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
});

export const reorderSectionSchema = z.object({
  id: z.string().cuid(),
  newSortOrder: z.number(),
});

export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
export type ReorderSectionInput = z.infer<typeof reorderSectionSchema>;
