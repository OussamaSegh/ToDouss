import { auth } from "@clerk/nextjs/server";
import { db } from "@todouss/db";
import { listVisibleProjectIds } from "@todouss/db";

export const runtime = "nodejs";

function esc(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function formatIcsDate(d: Date, allDay: boolean): string {
  if (allDay) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}${m}${day}`;
  }
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ workspaceSlug: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { workspaceSlug } = await ctx.params;
  const url = new URL(req.url);
  const projectIdFilter = url.searchParams.get("projectId") ?? undefined;

  const workspace = await db.workspace.findUnique({ where: { slug: workspaceSlug } });
  if (!workspace) {
    return new Response("Not found", { status: 404 });
  }

  const dbUser = await db.user.findUnique({ where: { clerkId: userId } });
  if (!dbUser) {
    return new Response("Unauthorized", { status: 401 });
  }

  const member = await db.workspaceMember.findFirst({
    where: { workspaceId: workspace.id, userId: dbUser.id },
  });
  if (!member) {
    return new Response("Forbidden", { status: 403 });
  }

  const visibleIds = await listVisibleProjectIds(db, workspace.id, dbUser.id, member.role);
  if (projectIdFilter && !visibleIds.includes(projectIdFilter)) {
    return new Response("Forbidden", { status: 403 });
  }

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 120);

  const rangeOverlap = {
    OR: [
      { startDate: { gte: from, lte: to } },
      { dueDate: { gte: from, lte: to } },
      {
        AND: [{ startDate: { lte: from } }, { dueDate: { gte: to } }],
      },
    ],
  };

  const tasks = await db.task.findMany({
    where: {
      workspaceId: workspace.id,
      parentTaskId: null,
      isArchived: false,
      status: { notIn: ["CANCELLED"] },
      AND: [rangeOverlap],
      projectId: projectIdFilter ? projectIdFilter : { in: visibleIds },
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      dueTime: true,
      startDate: true,
      description: true,
    },
    orderBy: [{ dueDate: "asc" }, { startDate: "asc" }],
  });

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ToDouss//EN",
    "CALSCALE:GREGORIAN",
  ];

  const now = new Date();

  for (const t of tasks) {
    const allDay = !t.dueTime;
    const start = t.startDate ?? t.dueDate;
    const end = t.dueDate ?? t.startDate ?? start;
    if (!start || !end) continue;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${t.id}@todouss`);
    lines.push(`DTSTAMP:${formatIcsDate(now, false)}`);
    if (allDay) {
      const d0 = new Date(start);
      d0.setHours(0, 0, 0, 0);
      const d1 = new Date(end);
      d1.setDate(d1.getDate() + 1);
      lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(d0, true)}`);
      lines.push(`DTEND;VALUE=DATE:${formatIcsDate(d1, true)}`);
    } else {
      lines.push(`DTSTART:${formatIcsDate(new Date(start), false)}`);
      lines.push(`DTEND:${formatIcsDate(new Date(end), false)}`);
    }
    lines.push(`SUMMARY:${esc(t.title)}`);
    if (t.description) {
      lines.push(`DESCRIPTION:${esc(t.description.replace(/<[^>]+>/g, ""))}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  const body = lines.join("\r\n");

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="todouss-${workspaceSlug}.ics"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
