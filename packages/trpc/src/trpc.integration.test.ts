import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { createTestPrismaClient, truncateAllTables } from "@todouss/db/test-helpers";
import type { PrismaClient } from "@todouss/db";
import { appRouter } from "./root";
import { createCallerFactory } from "./trpc";

const createCaller = createCallerFactory(appRouter);

const hasTestDb = Boolean(process.env["TEST_DATABASE_URL"]);

async function seedMemberWorkspaceWithInbox(
  prisma: PrismaClient,
  opts: { clerkId: string; email: string; slug: string; plan?: "FREE" | "PRO" },
) {
  const user = await prisma.user.create({
    data: { clerkId: opts.clerkId, email: opts.email, name: "User" },
  });
  const workspace = await prisma.workspace.create({
    data: {
      name: "W",
      slug: opts.slug,
      ownerId: user.id,
      plan: opts.plan ?? "FREE",
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });
  const inbox = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: "Inbox",
      sortOrder: 0,
      isInbox: true,
      members: { create: { userId: user.id, role: "ADMIN" } },
    },
  });
  return { user, workspace, inbox };
}

describe.skipIf(!hasTestDb)("tRPC integration — workspace, limits, isolation", () => {
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

  it("task.list only returns tasks for the active workspace", async () => {
    const a = await seedMemberWorkspaceWithInbox(prisma, {
      clerkId: "clerk_iso_a",
      email: "a@test.local",
      slug: `iso-a-${Date.now()}`,
    });
    const b = await seedMemberWorkspaceWithInbox(prisma, {
      clerkId: "clerk_iso_b",
      email: "b@test.local",
      slug: `iso-b-${Date.now()}`,
    });

    const taskA = await prisma.task.create({
      data: {
        workspaceId: a.workspace.id,
        projectId: a.inbox.id,
        creatorId: a.user.id,
        title: "Task A",
        sortOrder: 0,
        boardOrder: 0,
      },
    });
    await prisma.task.create({
      data: {
        workspaceId: b.workspace.id,
        projectId: b.inbox.id,
        creatorId: b.user.id,
        title: "Task B",
        sortOrder: 0,
        boardOrder: 0,
      },
    });

    const callerA = createCaller({
      db: prisma,
      userId: a.user.clerkId,
      headers: new Headers(),
    });

    const { tasks } = await callerA.task.list({
      workspaceId: a.workspace.id,
      limit: 50,
      includeCompleted: true,
      isArchived: false,
    });

    expect(tasks.map((t) => t.id)).toEqual([taskA.id]);
  });

  it("task.get returns NOT_FOUND for a task id from another workspace", async () => {
    const a = await seedMemberWorkspaceWithInbox(prisma, {
      clerkId: "clerk_iso2_a",
      email: "a2@test.local",
      slug: `iso2-a-${Date.now()}`,
    });
    const b = await seedMemberWorkspaceWithInbox(prisma, {
      clerkId: "clerk_iso2_b",
      email: "b2@test.local",
      slug: `iso2-b-${Date.now()}`,
    });

    const taskB = await prisma.task.create({
      data: {
        workspaceId: b.workspace.id,
        projectId: b.inbox.id,
        creatorId: b.user.id,
        title: "Other",
        sortOrder: 0,
        boardOrder: 0,
      },
    });

    const callerA = createCaller({
      db: prisma,
      userId: a.user.clerkId,
      headers: new Headers(),
    });

    await expect(
      callerA.task.get({ workspaceId: a.workspace.id, taskId: taskB.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects access when user is not a member of workspaceId", async () => {
    const a = await seedMemberWorkspaceWithInbox(prisma, {
      clerkId: "clerk_iso3_a",
      email: "a3@test.local",
      slug: `iso3-a-${Date.now()}`,
    });
    const b = await seedMemberWorkspaceWithInbox(prisma, {
      clerkId: "clerk_iso3_b",
      email: "b3@test.local",
      slug: `iso3-b-${Date.now()}`,
    });

    const callerA = createCaller({
      db: prisma,
      userId: a.user.clerkId,
      headers: new Headers(),
    });

    await expect(
      callerA.task.list({
        workspaceId: b.workspace.id,
        limit: 50,
        includeCompleted: true,
        isArchived: false,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks project.create when FREE workspace is at the active project cap", async () => {
    const { user, workspace, inbox } = await seedMemberWorkspaceWithInbox(prisma, {
      clerkId: "clerk_proj_cap",
      email: "cap@test.local",
      slug: `proj-cap-${Date.now()}`,
      plan: "FREE",
    });

    for (let i = 0; i < 4; i++) {
      await prisma.project.create({
        data: {
          workspaceId: workspace.id,
          name: `Extra ${i}`,
          sortOrder: i + 1,
          isInbox: false,
          members: { create: { userId: user.id, role: "ADMIN" } },
        },
      });
    }

    const count = await prisma.project.count({
      where: { workspaceId: workspace.id, status: "ACTIVE" },
    });
    expect(count).toBe(5);

    const caller = createCaller({
      db: prisma,
      userId: user.clerkId,
      headers: new Headers(),
    });

    await expect(
      caller.project.create({
        workspaceId: workspace.id,
        name: "One too many",
        color: "#6366f1",
        icon: "folder",
        isPrivate: false,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks invite.create when FREE workspace is at the member cap", async () => {
    const { user, workspace } = await seedMemberWorkspaceWithInbox(prisma, {
      clerkId: "clerk_inv_cap_o",
      email: "owner-inv@test.local",
      slug: `inv-cap-${Date.now()}`,
      plan: "FREE",
    });

    const other = await prisma.user.create({
      data: {
        clerkId: "clerk_inv_cap_m",
        email: "member-inv@test.local",
        name: "M",
      },
    });
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: other.id,
        role: "MEMBER",
      },
    });

    const memberCount = await prisma.workspaceMember.count({ where: { workspaceId: workspace.id } });
    expect(memberCount).toBe(2);

    const caller = createCaller({
      db: prisma,
      userId: user.clerkId,
      headers: new Headers(),
    });

    await expect(
      caller.invite.create({
        workspaceId: workspace.id,
        email: "stranger@example.com",
        role: "MEMBER",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
