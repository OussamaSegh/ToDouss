import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db, buildVisibleProjectWhere } from "@todouss/db";
import { AppShell } from "@/components/layout/app-shell";
import type { WorkspaceData } from "@/types/workspace";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { workspaceSlug } = await params;

  const dbUser = await db.user.findUnique({ where: { clerkId: userId } });
  if (!dbUser) redirect("/sign-in");

  const memberships = await db.workspaceMember.findMany({
    where: { userId: dbUser.id },
    include: { workspace: true },
    orderBy: { joinedAt: "asc" },
  });

  const workspaces: WorkspaceData[] = memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    slug: m.workspace.slug,
    logoUrl: m.workspace.logoUrl,
    ownerId: m.workspace.ownerId,
    plan: m.workspace.plan as WorkspaceData["plan"],
    storageUsed: m.workspace.storageUsed,
    createdAt: m.workspace.createdAt,
    updatedAt: m.workspace.updatedAt,
    role: m.role as WorkspaceData["role"],
  }));

  const workspace = await db.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: { members: { where: { userId: dbUser.id } } },
  });

  if (!workspace || workspace.members.length === 0) {
    if (memberships.length === 0) {
      redirect("/onboarding");
    }
    notFound();
  }

  const currentMembership = workspaces.find((w) => w.id === workspace.id);

  const membershipRow = workspace.members[0];
  const projectWhere = await buildVisibleProjectWhere(
    db,
    workspace.id,
    dbUser.id,
    membershipRow?.role ?? "MEMBER",
  );

  const projects = await db.project.findMany({
    where: projectWhere,
    orderBy: { sortOrder: "asc" },
  });

  return (
    <AppShell
      workspace={{
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        logoUrl: workspace.logoUrl,
        ownerId: workspace.ownerId,
        plan: workspace.plan as WorkspaceData["plan"],
        storageUsed: workspace.storageUsed,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
        role: currentMembership?.role,
      }}
      projects={projects.map((p) => ({
        id: p.id,
        workspaceId: p.workspaceId,
        name: p.name,
        description: p.description,
        color: p.color,
        icon: p.icon,
        status: p.status as "ACTIVE" | "ARCHIVED" | "COMPLETED",
        isPrivate: p.isPrivate,
        isInbox: p.isInbox,
        sortOrder: p.sortOrder,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }))}
      workspaces={workspaces}
      currentUser={{
        id: dbUser.id,
        clerkId: dbUser.clerkId,
        email: dbUser.email,
        name: dbUser.name,
        avatarUrl: dbUser.avatarUrl,
        timezone: dbUser.timezone,
        locale: dbUser.locale,
      }}
    >
      {children}
    </AppShell>
  );
}
