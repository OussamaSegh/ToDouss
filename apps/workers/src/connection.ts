import IORedis from "ioredis";

export function getWorkerRedis(): IORedis {
  const url = process.env["REDIS_URL"];
  if (!url) {
    throw new Error("REDIS_URL is not set (use redis://localhost:6379 or your provider TCP URL)");
  }
  return new IORedis(url, { maxRetriesPerRequest: null });
}
