import { PrismaClient } from "./generated/client";

export function getIntegrationTestDatabaseUrl(): string {
  const url = process.env["TEST_DATABASE_URL"];
  if (!url || url.length === 0) {
    throw new Error("TEST_DATABASE_URL must be set to run integration tests");
  }
  return url;
}

/** Separate client for integration tests; avoids reusing the dev singleton with the wrong URL. */
export function createTestPrismaClient(): PrismaClient {
  return new PrismaClient({
    datasourceUrl: getIntegrationTestDatabaseUrl(),
    log: process.env["DEBUG_PRISMA"] ? ["query", "error", "warn"] : ["error"],
  });
}

/**
 * Wipes all application tables in the **test** database. Only call from integration tests
 * after `getIntegrationTestDatabaseUrl()` has validated `TEST_DATABASE_URL`.
 */
export async function truncateAllTables(prisma: PrismaClient): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE '_prisma_migrations'
  `;
  if (rows.length === 0) return;
  const list = rows.map((r) => `"${r.tablename.replace(/"/g, '""')}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
