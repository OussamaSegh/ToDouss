import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@todouss/db";
import { getPlanLimits } from "@todouss/billing";

export async function assertCanCreateProject(
  db: PrismaClient,
  workspaceId: string,
  plan: string,
): Promise<void> {
  const limits = getPlanLimits(plan);
  if (limits.maxActiveProjects == null) return;
  const count = await db.project.count({
    where: { workspaceId, status: "ACTIVE" },
  });
  if (count >= limits.maxActiveProjects) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Project limit reached (${limits.maxActiveProjects} on ${plan}). Upgrade your plan to add more.`,
    });
  }
}

export async function assertCanAddWorkspaceMember(
  db: PrismaClient,
  workspaceId: string,
  plan: string,
): Promise<void> {
  const limits = getPlanLimits(plan);
  if (limits.maxMembers == null) return;
  const count = await db.workspaceMember.count({ where: { workspaceId } });
  if (count >= limits.maxMembers) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Member limit reached (${limits.maxMembers} on ${plan}). Upgrade your plan to invite more people.`,
    });
  }
}

export async function assertStorageWithinPlan(
  db: PrismaClient,
  workspaceId: string,
  plan: string,
  additionalBytes: number,
): Promise<void> {
  const limits = getPlanLimits(plan);
  if (limits.maxStorageBytes == null) return;
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { storageUsed: true },
  });
  const used = workspace?.storageUsed ?? 0;
  if (used + additionalBytes > limits.maxStorageBytes) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Storage limit exceeded for ${plan}. Remove files or upgrade.`,
    });
  }
}
