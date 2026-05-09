import { TRPCError } from "@trpc/server";
import type { Prisma, WorkspaceRole } from "@todouss/db";
import { listVisibleProjectIds } from "@todouss/db";
import type { PrismaClient } from "@todouss/db";

export async function mergeTaskProjectScope(
  db: PrismaClient,
  workspaceId: string,
  memberUserId: string,
  role: WorkspaceRole,
  projectId: string | undefined,
  target: Prisma.TaskWhereInput,
): Promise<void> {
  const visibleIds = await listVisibleProjectIds(db, workspaceId, memberUserId, role);
  if (projectId) {
    if (!visibleIds.includes(projectId)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have access to this project.",
      });
    }
    target.projectId = projectId;
    return;
  }
  target.projectId = { in: visibleIds };
}

export async function assertTaskProjectAccess(
  db: PrismaClient,
  workspaceId: string,
  memberUserId: string,
  role: WorkspaceRole,
  taskProjectId: string | null,
): Promise<void> {
  if (!taskProjectId) return;
  const visibleIds = await listVisibleProjectIds(db, workspaceId, memberUserId, role);
  if (!visibleIds.includes(taskProjectId)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
  }
}

export async function assertProjectIdAccessible(
  db: PrismaClient,
  workspaceId: string,
  memberUserId: string,
  role: WorkspaceRole,
  projectId: string | undefined | null,
): Promise<void> {
  if (!projectId) return;
  const visibleIds = await listVisibleProjectIds(db, workspaceId, memberUserId, role);
  if (!visibleIds.includes(projectId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this project." });
  }
}
