import { z } from "zod";

export const taskStatusEnum = z.enum(["INBOX", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"]);
export const priorityEnum = z.enum(["P1", "P2", "P3", "P4"]);
export const viewTypeEnum = z.enum(["LIST", "BOARD", "CALENDAR", "TIMELINE", "TABLE"]);

export const createTaskSchema = z.object({
  workspaceId: z.string().cuid(),
  projectId: z.string().cuid().optional(),
  sectionId: z.string().cuid().optional(),
  parentTaskId: z.string().cuid().optional(),
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().optional(),
  status: taskStatusEnum.default("TODO"),
  priority: priorityEnum.default("P4"),
  dueDate: z.date().optional(),
  dueTime: z.boolean().default(false),
  startDate: z.date().optional(),
  assigneeId: z.string().cuid().optional(),
  labelIds: z.array(z.string().cuid()).default([]),
});

export const updateTaskSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional().nullable(),
  status: taskStatusEnum.optional(),
  priority: priorityEnum.optional(),
  dueDate: z.date().optional().nullable(),
  dueTime: z.boolean().optional(),
  startDate: z.date().optional().nullable(),
  assigneeId: z.string().cuid().optional().nullable(),
  projectId: z.string().cuid().optional().nullable(),
  sectionId: z.string().cuid().optional().nullable(),
  labelIds: z.array(z.string().cuid()).optional(),
  sortOrder: z.number().optional(),
  boardOrder: z.number().optional(),
  isArchived: z.boolean().optional(),
});

export const reorderTaskSchema = z.object({
  taskId: z.string().cuid(),
  newSortOrder: z.number(),
  newBoardOrder: z.number().optional(),
  newProjectId: z.string().cuid().optional().nullable(),
  newSectionId: z.string().cuid().optional().nullable(),
  newStatus: taskStatusEnum.optional(),
});

export const taskFilterSchema = z.object({
  workspaceId: z.string().cuid(),
  projectId: z.string().cuid().optional(),
  status: z.array(taskStatusEnum).optional(),
  priority: z.array(priorityEnum).optional(),
  assigneeId: z.array(z.string().cuid()).optional(),
  labelIds: z.array(z.string().cuid()).optional(),
  dueBefore: z.date().optional(),
  dueAfter: z.date().optional(),
  isArchived: z.boolean().default(false),
  search: z.string().optional(),
  cursor: z.string().cuid().optional(),
  limit: z.number().min(1).max(100).default(50),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ReorderTaskInput = z.infer<typeof reorderTaskSchema>;
export type TaskFilterInput = z.infer<typeof taskFilterSchema>;
