import { z } from "zod";

export const createProjectSchema = z.object({
  workspaceId: z.string().cuid(),
  name: z.string().min(1, "Project name is required").max(128),
  description: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6366f1"),
  icon: z.string().default("folder"),
  isPrivate: z.boolean().default(false),
});

export const updateProjectSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(1000).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().optional(),
  isPrivate: z.boolean().optional(),
  status: z.enum(["ACTIVE", "ARCHIVED", "COMPLETED"]).optional(),
  sortOrder: z.number().int().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
