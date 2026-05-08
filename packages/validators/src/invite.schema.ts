import { z } from "zod";

const workspaceRoleSchema = z.enum(["ADMIN", "MEMBER", "VIEWER"]);

export const createInviteSchema = z.object({
  workspaceId: z.string().cuid(),
  email: z.string().email(),
  role: workspaceRoleSchema.default("MEMBER"),
});

export const listInvitesSchema = z.object({
  workspaceId: z.string().cuid(),
});

export const resendInviteSchema = z.object({
  workspaceId: z.string().cuid(),
  inviteId: z.string().cuid(),
});

export const revokeInviteSchema = z.object({
  workspaceId: z.string().cuid(),
  inviteId: z.string().cuid(),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
});
