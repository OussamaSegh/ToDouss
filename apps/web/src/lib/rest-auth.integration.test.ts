import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { createTestPrismaClient, truncateAllTables } from "@todouss/db/test-helpers";
import type { PrismaClient } from "@todouss/db";
import { hashApiKey } from "@todouss/trpc/crypto-keys";
import { authenticateApiRequest, buildTasksWhereForApi } from "./rest-auth";

const hasTestDb = Boolean(process.env["TEST_DATABASE_URL"]);

describe.skipIf(!hasTestDb)("authenticateApiRequest (integration)", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = createTestPrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
  });

  it("resolves a valid td_live_ key to the workspace and member role", async () => {
    const user = await prisma.user.create({
      data: { clerkId: "clerk_rest_1", email: "rest1@test.local", name: "R1" },
    });
    const ws = await prisma.workspace.create({
      data: {
        name: "API WS",
        slug: `api-ws-${Date.now()}`,
        ownerId: user.id,
        plan: "FREE",
        members: { create: { userId: user.id, role: "OWNER" } },
      },
    });
    const rawKey = "td_live_" + "a".repeat(48);
    await prisma.apiKey.create({
      data: {
        workspaceId: ws.id,
        userId: user.id,
        name: "test",
        keyHash: hashApiKey(rawKey),
        prefix: rawKey.slice(0, 12),
      },
    });

    const req = new Request("http://localhost/api/v1/tasks", {
      headers: { Authorization: `Bearer ${rawKey}` },
    });
    const auth = await authenticateApiRequest(req, prisma);
    expect(auth).toEqual({
      workspaceId: ws.id,
      userId: user.id,
      role: "OWNER",
    });

    const where = await buildTasksWhereForApi(
      {
        workspaceId: ws.id,
        userId: user.id,
        role: "OWNER",
        projectId: undefined,
      },
      prisma,
    );
    expect(where.workspaceId).toBe(ws.id);
    expect(where.isArchived).toBe(false);
  });
});
