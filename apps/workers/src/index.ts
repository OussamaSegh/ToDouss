import { Queue, Worker } from "bullmq";
import { db } from "@todouss/db";
import { getWorkerRedis } from "./connection";
import { processReminders } from "./jobs/reminders";
import { processRecurringTasks } from "./jobs/recurring";
import { processOutboundWebhookSweep } from "./jobs/webhooks";

const QUEUE = "todouss";

async function main() {
  const connection = getWorkerRedis();
  const queue = new Queue(QUEUE, { connection });

  await queue.add(
    "tick",
    {},
    {
      repeat: { every: 60_000 },
      jobId: "global-tick",
      removeOnComplete: { count: 5 },
      removeOnFail: { count: 3 },
    },
  );

  new Worker(
    QUEUE,
    async (job) => {
      if (job.name === "tick") {
        await processReminders(db);
        await processRecurringTasks(db);
        await processOutboundWebhookSweep(db);
      }
    },
    { connection },
  );

  console.log("[workers] BullMQ worker running; tick every 60s");
}

main().catch((e) => {
  console.error("[workers] fatal", e);
  process.exit(1);
});
