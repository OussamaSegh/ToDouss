import { z } from "zod";
import { taskFilterSchema, viewTypeEnum } from "./task.schema";

const sortDirectionEnum = z.enum(["asc", "desc"]);

export const savedViewFilterSchema = taskFilterSchema
  .omit({
    workspaceId: true,
    cursor: true,
    limit: true,
  })
  .partial();

export const listSavedViewSchema = z.object({
  workspaceId: z.string().cuid(),
  projectId: z.string().cuid().optional(),
  includeShared: z.boolean().default(true),
});

export const createSavedViewSchema = z.object({
  workspaceId: z.string().cuid(),
  projectId: z.string().cuid().optional().nullable(),
  name: z.string().min(1).max(120),
  viewType: viewTypeEnum.default("LIST"),
  filters: savedViewFilterSchema.default({}),
  sortBy: z.string().min(1).default("sortOrder"),
  sortDir: sortDirectionEnum.default("asc"),
  groupBy: z.string().optional().nullable(),
  isShared: z.boolean().default(false),
});

export const updateSavedViewSchema = z.object({
  workspaceId: z.string().cuid(),
  id: z.string().cuid(),
  name: z.string().min(1).max(120).optional(),
  viewType: viewTypeEnum.optional(),
  filters: savedViewFilterSchema.optional(),
  sortBy: z.string().min(1).optional(),
  sortDir: sortDirectionEnum.optional(),
  groupBy: z.string().optional().nullable(),
  isShared: z.boolean().optional(),
});

export const deleteSavedViewSchema = z.object({
  workspaceId: z.string().cuid(),
  id: z.string().cuid(),
});

export const applySavedViewSchema = z.object({
  workspaceId: z.string().cuid(),
  id: z.string().cuid(),
});

export const reorderSavedViewSchema = z.object({
  workspaceId: z.string().cuid(),
  orderedIds: z.array(z.string().cuid()).min(1),
});
