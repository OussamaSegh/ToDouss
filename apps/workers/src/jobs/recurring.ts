import type { PrismaClient } from "@todouss/db";
import { createNextRecurringInstance, parseRecurrenceRule } from "@todouss/trpc/recurrence";

export async function processRecurringTasks(db: PrismaClient): Promise<void> {
  const templates = await db.task.findMany({
    where: {
      isRecurring: true,
      recurrenceRule: { not: null },
      isArchived: false,
    },
    take: 80,
  });

  for (const source of templates) {
    try {
      const normalized = parseRecurrenceRule(source.recurrenceRule!);
      if (!normalized) continue;

      const latestInSeries = await db.task.findFirst({
        where: {
          workspaceId: source.workspaceId,
          OR: [{ id: source.id }, { recurrenceParentId: source.id }],
        },
        orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
      });
      if (!latestInSeries) continue;
      if (latestInSeries.status !== "DONE") continue;

      const next = createNextRecurringInstance(latestInSeries, normalized);
      if (!next?.dueDate) continue;

      const existing = await db.task.findFirst({
        where: {
          workspaceId: source.workspaceId,
          recurrenceParentId: source.id,
          dueDate: next.dueDate,
        },
      });
      if (existing) continue;

      const labels = await db.taskLabel.findMany({
        where: { taskId: source.id },
        select: { labelId: true },
      });

      await db.task.create({
        data: {
          workspaceId: source.workspaceId,
          projectId: source.projectId,
          sectionId: source.sectionId,
          parentTaskId: null,
          creatorId: source.creatorId,
          assigneeId: source.assigneeId,
          title: source.title,
          description: source.description,
          status: "TODO",
          priority: source.priority,
          dueDate: next.dueDate,
          dueTime: source.dueTime,
          startDate: next.startDate,
          sortOrder: source.sortOrder + 0.001,
          boardOrder: source.boardOrder + 0.001,
          isRecurring: false,
          recurrenceParentId: source.id,
          labels: {
            create: labels.map((l) => ({
              labelId: l.labelId,
            })),
          },
        },
      });
    } catch (err) {
      console.error("[workers] recurring failed", source.id, err);
    }
  }
}
