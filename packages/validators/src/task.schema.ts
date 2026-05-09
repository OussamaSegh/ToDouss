import { z } from "zod";

export const taskStatusEnum = z.enum(["INBOX", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"]);
export const priorityEnum = z.enum(["P1", "P2", "P3", "P4"]);
export const viewTypeEnum = z.enum(["LIST", "BOARD", "CALENDAR", "TIMELINE", "TABLE"]);
export const datePresetEnum = z.enum([
  "TODAY",
  "TOMORROW",
  "THIS_WEEK",
  "NEXT_7_DAYS",
  "NEXT_30_DAYS",
  "OVERDUE",
  "NO_DATE",
  "CUSTOM",
]);
export const recurrenceFrequencyEnum = z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]);

export const recurrenceRuleSchema = z.object({
  frequency: recurrenceFrequencyEnum,
  interval: z.number().int().min(1).max(365).default(1),
  weekdays: z.array(z.number().int().min(0).max(6)).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  timezone: z.string().min(1).default("UTC"),
  until: z.date().optional(),
  count: z.number().int().min(1).optional(),
});

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
  isRecurring: z.boolean().default(false),
  recurrenceRule: recurrenceRuleSchema.optional(),
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
  isRecurring: z.boolean().optional(),
  recurrenceRule: recurrenceRuleSchema.optional().nullable(),
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
  datePreset: datePresetEnum.optional(),
  startDateFrom: z.date().optional(),
  startDateTo: z.date().optional(),
  dueBefore: z.date().optional(),
  dueAfter: z.date().optional(),
  includeCompleted: z.boolean().default(false),
  isRecurring: z.boolean().optional(),
  isArchived: z.boolean().default(false),
  search: z.string().optional(),
  cursor: z.string().cuid().optional(),
  limit: z.number().min(1).max(100).default(50),
});

export const taskRangeSchema = z.object({
  workspaceId: z.string().cuid(),
  projectId: z.string().cuid().optional(),
  from: z.date(),
  to: z.date(),
  includeArchived: z.boolean().default(false),
  includeCompleted: z.boolean().default(true),
  labelIds: z.array(z.string().cuid()).optional(),
  assigneeId: z.array(z.string().cuid()).optional(),
  status: z.array(taskStatusEnum).optional(),
  priority: z.array(priorityEnum).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ReorderTaskInput = z.infer<typeof reorderTaskSchema>;
export type TaskFilterInput = z.infer<typeof taskFilterSchema>;
