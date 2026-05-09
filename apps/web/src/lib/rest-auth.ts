import "server-only";
import { db } from "@todouss/db";
import type { Prisma, WorkspaceRole } from "@todouss/db";
import { hashApiKey } from "@todouss/trpc/crypto-keys";
import { mergeTaskProjectScope } from "@todouss/trpc/task-scope";

export interface RestApiAuth {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
}

export async function authenticateApiRequest(req: Request): Promise<RestApiAuth | null> {
  const auth = req.headers.get("authorization");
  const raw = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!raw?.startsWith("td_live_")) return null;

  const keyHash = hashApiKey(raw);
  const row = await db.apiKey.findUnique({
    where: { keyHash },
    select: { id: true, workspaceId: true, userId: true, expiresAt: true },
  });
  if (!row) return null;
  if (row.expiresAt && row.expiresAt < new Date()) return null;

  await db.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } });

  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: row.workspaceId, userId: row.userId } },
  });
  if (!member) return null;

  return { workspaceId: row.workspaceId, userId: row.userId, role: member.role };
}

export async function buildTasksWhereForApi(params: {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  projectId: string | undefined;
}): Promise<Prisma.TaskWhereInput> {
  const where: Prisma.TaskWhereInput = {
    workspaceId: params.workspaceId,
    isArchived: false,
  };
  await mergeTaskProjectScope(
    db,
    params.workspaceId,
    params.userId,
    params.role,
    params.projectId,
    where,
  );
  return where;
}
