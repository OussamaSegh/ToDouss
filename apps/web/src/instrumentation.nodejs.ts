import { existsSync } from "node:fs";
import path from "node:path";

const RHEL_LIBRARY_ENGINE = "libquery_engine-rhel-openssl-3.0.x.so.node";

export function registerPrismaQueryEnginePath() {
  if (process.env["PRISMA_QUERY_ENGINE_LIBRARY"]) return;

  const serverless =
    process.env["VERCEL"] === "1" || Boolean(process.env["AWS_LAMBDA_FUNCTION_NAME"]);
  if (!serverless) return;

  const candidates = [
    path.join(process.cwd(), "../../packages/db/src/generated/client", RHEL_LIBRARY_ENGINE),
    path.join(process.cwd(), "../packages/db/src/generated/client", RHEL_LIBRARY_ENGINE),
  ];

  for (const absolute of candidates) {
    if (existsSync(absolute)) {
      process.env["PRISMA_QUERY_ENGINE_LIBRARY"] = absolute;
      return;
    }
  }
}
