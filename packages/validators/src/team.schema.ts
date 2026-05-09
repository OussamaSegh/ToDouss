import { z } from "zod";

export const createTeamSchema = z.object({
  workspaceId: z.string().cuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().max(32).optional(),
});

export const updateTeamSchema = z.object({
  workspaceId: z.string().cuid(),
  teamId: z.string().cuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  color: z.string().max(32).optional().nullable(),
});

export const deleteTeamSchema = z.object({
  workspaceId: z.string().cuid(),
  teamId: z.string().cuid(),
});

export const addTeamMemberSchema = z.object({
  workspaceId: z.string().cuid(),
  teamId: z.string().cuid(),
  workspaceMemberId: z.string().cuid(),
  role: z.enum(["LEAD", "MEMBER"]).default("MEMBER"),
});

export const removeTeamMemberSchema = z.object({
  workspaceId: z.string().cuid(),
  teamId: z.string().cuid(),
  teamMemberId: z.string().cuid(),
});

export const setProjectTeamsSchema = z.object({
  workspaceId: z.string().cuid(),
  projectId: z.string().cuid(),
  teamIds: z.array(z.string().cuid()),
});
