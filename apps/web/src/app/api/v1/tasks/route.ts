import { NextResponse } from "next/server";
import { db } from "@todouss/db";
import { listVisibleProjectIds } from "@todouss/db";
import { authenticateApiRequest, buildTasksWhereForApi } from "@/lib/rest-auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateApiRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId") ?? undefined;

  try {
    const where = await buildTasksWhereForApi({
      workspaceId: auth.workspaceId,
      userId: auth.userId,
      role: auth.role,
      projectId,
    });
    const tasks = await db.task.findMany({
      where,
      take: 100,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        projectId: true,
        dueDate: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ tasks });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function POST(req: Request) {
  const auth = await authenticateApiRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { title?: string; projectId?: string; status?: string };
  try {
    body = (await req.json()) as { title?: string; projectId?: string; status?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const projectId = body.projectId ?? undefined;
  if (projectId) {
    const visible = await listVisibleProjectIds(
      db,
      auth.workspaceId,
      auth.userId,
      auth.role,
    );
    if (!visible.includes(projectId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const maxOrder = await db.task.findFirst({
    where: { workspaceId: auth.workspaceId, projectId: projectId ?? null },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const status =
    body.status === "TODO" ||
    body.status === "IN_PROGRESS" ||
    body.status === "IN_REVIEW" ||
    body.status === "DONE" ||
    body.status === "CANCELLED" ||
    body.status === "INBOX"
      ? body.status
      : "TODO";

  const task = await db.task.create({
    data: {
      workspaceId: auth.workspaceId,
      projectId: projectId ?? null,
      creatorId: auth.userId,
      title,
      status,
      sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      boardOrder: 0,
    },
    select: {
      id: true,
      title: true,
      status: true,
      projectId: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ task }, { status: 201 });
}
