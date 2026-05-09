import { describe, expect, it } from "vitest";
import {
  createApiKeySchema,
  createTaskSchema,
  createWebhookSchema,
  taskRangeSchema,
} from "./index";

const W1 = "cjld2cjxh0000qzrmn831i7rn";
const W2 = "ck6bhcjxh0000qzrmn831i7rn";
const W3 = "ck6bhcjxh0001qzrmn831i7ab";

describe("taskRangeSchema", () => {
  it("parses a valid range", () => {
    const from = new Date("2026-01-05T00:00:00.000Z");
    const to = new Date("2026-01-11T23:59:59.000Z");
    const out = taskRangeSchema.parse({
      workspaceId: W1,
      from,
      to,
    });
    expect(out.from).toEqual(from);
    expect(out.to).toEqual(to);
    expect(out.includeArchived).toBe(false);
    expect(out.includeCompleted).toBe(true);
  });

  it("accepts optional filters", () => {
    const parsed = taskRangeSchema.parse({
      workspaceId: W1,
      from: new Date("2026-01-05"),
      to: new Date("2026-01-11"),
      labelIds: [W2],
      projectId: W3,
    });
    expect(parsed.labelIds).toHaveLength(1);
    expect(parsed.projectId).toBe(W3);
  });
});

describe("createTaskSchema", () => {
  it("applies defaults and accepts minimal create payload", () => {
    const parsed = createTaskSchema.parse({
      workspaceId: W1,
      title: "Hello",
    });
    expect(parsed.status).toBe("TODO");
    expect(parsed.priority).toBe("P4");
    expect(parsed.labelIds).toEqual([]);
    expect(parsed.isRecurring).toBe(false);
    expect(parsed.dueTime).toBe(false);
  });

  it("rejects empty title", () => {
    expect(() =>
      createTaskSchema.parse({
        workspaceId: W1,
        title: "",
      }),
    ).toThrow();
  });
});

describe("API key & webhook schemas", () => {
  it("createApiKeySchema requires cuid workspace and non-empty name", () => {
    expect(() =>
      createApiKeySchema.parse({
        workspaceId: "not-a-cuid",
        name: "CI",
      }),
    ).toThrow();
    expect(
      createApiKeySchema.parse({
        workspaceId: W1,
        name: "CI key",
        expiresAt: new Date("2027-01-01"),
      }).name,
    ).toBe("CI key");
  });

  it("createWebhookSchema enforces URL and events", () => {
    const parsed = createWebhookSchema.parse({
      workspaceId: W1,
      url: "https://example.com/hook",
      events: ["task.created"],
    });
    expect(parsed.events).toEqual(["task.created"]);
    expect(() =>
      createWebhookSchema.parse({
        workspaceId: W1,
        url: "not-a-url",
        events: ["e"],
      }),
    ).toThrow();
  });
});
