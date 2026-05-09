import { z } from "zod";

export const createApiKeySchema = z.object({
  workspaceId: z.string().cuid(),
  name: z.string().min(1).max(80),
  expiresAt: z.date().optional(),
});

export const revokeApiKeySchema = z.object({
  workspaceId: z.string().cuid(),
  apiKeyId: z.string().cuid(),
});

export const createWebhookSchema = z.object({
  workspaceId: z.string().cuid(),
  url: z.string().url(),
  events: z.array(z.string().min(1)).min(1),
});

export const deleteWebhookSchema = z.object({
  workspaceId: z.string().cuid(),
  webhookId: z.string().cuid(),
});
