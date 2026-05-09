import type { PrismaClient } from "@todouss/db";

/**
 * Outbound webhooks: extend with a durable outbox + signing when events are emitted from the app.
 * The worker process is ready to host BullMQ job handlers for `webhook.deliver` payloads.
 */
export async function processOutboundWebhookSweep(_db: PrismaClient): Promise<void> {
  void _db;
  /* Reserved — see packages/trpc outbound dispatch from task/comment routers in a follow-up. */
}
