import type { Prisma, PrismaClient, WorkspaceRole } from "./generated/client";

/**
 * Projects with no `ProjectTeam` rows are visible to all workspace members.
 * Restricted projects are those with at least one team link — then only members
 * of those teams (or explicit `ProjectMember`, or workspace admins) may see them.
 */
export async function buildVisibleProjectWhere(
  db: PrismaClient,
  workspaceId: string,
  dbUserId: string,
  role: WorkspaceRole,
): Promise<Prisma.ProjectWhereInput> {
  if (role === "OWNER" || role === "ADMIN") {
    return { workspaceId };
  }

  const teamMemberships = await db.teamMember.findMany({
    where: { member: { userId: dbUserId, workspaceId } },
    select: { teamId: true },
  });
  const myTeamIds = teamMemberships.map((t) => t.teamId);

  return {
    workspaceId,
    OR: [
      { teams: { none: {} } },
      { members: { some: { userId: dbUserId } } },
      ...(myTeamIds.length ? [{ teams: { some: { teamId: { in: myTeamIds } } } }] : []),
    ],
  };
}

export async function listVisibleProjectIds(
  db: PrismaClient,
  workspaceId: string,
  dbUserId: string,
  role: WorkspaceRole,
): Promise<string[]> {
  const where = await buildVisibleProjectWhere(db, workspaceId, dbUserId, role);
  const rows = await db.project.findMany({ where, select: { id: true } });
  return rows.map((r) => r.id);
}
