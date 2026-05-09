import type { PrismaClient } from "@todouss/db";

export async function processReminders(db: PrismaClient): Promise<void> {
  const due = await db.reminder.findMany({
    where: { sent: false, remindAt: { lte: new Date() } },
    take: 200,
    include: {
      task: { select: { title: true, id: true, workspaceId: true } },
    },
  });

  for (const r of due) {
    try {
      await db.$transaction(async (tx) => {
        await tx.reminder.update({
          where: { id: r.id },
          data: { sent: true, sentAt: new Date() },
        });
        await tx.notification.create({
          data: {
            userId: r.userId,
            type: "TASK_DUE_SOON",
            title: "Task reminder",
            body: r.task.title,
            meta: {
              taskId: r.taskId,
              workspaceId: r.task.workspaceId,
              reminderId: r.id,
            },
          },
        });
      });
    } catch (err) {
      console.error("[workers] reminder failed", r.id, err);
    }
  }
}
