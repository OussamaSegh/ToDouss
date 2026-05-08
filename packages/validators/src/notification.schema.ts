import { z } from "zod";

export const listNotificationsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(30),
  cursor: z.string().cuid().optional(),
});

export const markNotificationReadSchema = z.object({
  notificationId: z.string().cuid(),
});

export const markAllNotificationsReadSchema = z.object({});
