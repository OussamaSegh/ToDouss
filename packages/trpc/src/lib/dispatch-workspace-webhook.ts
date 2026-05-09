import { createHmac } from "crypto";
import type { PrismaClient } from "@todouss/db";

export async function dispatchWorkspaceWebhooks(
  db: PrismaClient,
  workspaceId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const hooks = await db.webhook.findMany({
    where: { workspaceId, isActive: true, events: { has: eventType } },
  });
  if (!hooks.length) return;

  const body = JSON.stringify({
    type: eventType,
    payload,
    sentAt: new Date().toISOString(),
  });

  await Promise.all(
    hooks.map(async (h) => {
      try {
        const sig = createHmac("sha256", h.secret).update(body).digest("hex");
        const res = await fetch(h.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-ToDouss-Signature": sig,
            "X-ToDouss-Event": eventType,
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });
        await db.webhook.update({
          where: { id: h.id },
          data: {
            lastPingAt: new Date(),
            failCount: res.ok ? 0 : { increment: 1 },
          },
        });
      } catch {
        await db.webhook.update({
          where: { id: h.id },
          data: { failCount: { increment: 1 } },
        });
      }
    }),
  );
}
