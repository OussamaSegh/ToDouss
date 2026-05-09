import { describe, expect, it } from "vitest";
import {
  buildRecurrenceTaskPayload,
  createNextRecurringInstance,
  parseRecurrenceRule,
} from "./recurrence";

describe("recurrence helpers", () => {
  it("parseRecurrenceRule handles JSON and invalid input", () => {
    expect(parseRecurrenceRule("")).toBeNull();
    expect(parseRecurrenceRule("{")).toBeNull();
    const rule = parseRecurrenceRule(
      JSON.stringify({ frequency: "DAILY", interval: 2, timezone: "America/New_York" }),
    );
    expect(rule).toMatchObject({ frequency: "DAILY", interval: 2, timezone: "America/New_York" });
  });

  it("buildRecurrenceTaskPayload reflects recurring flag", () => {
    expect(buildRecurrenceTaskPayload({})).toEqual({});
    expect(buildRecurrenceTaskPayload({ isRecurring: false })).toEqual({
      isRecurring: false,
      recurrenceRule: null,
    });
    const encoded = buildRecurrenceTaskPayload({
      isRecurring: true,
      recurrenceRule: { frequency: "WEEKLY", interval: 1 },
    });
    expect(encoded.isRecurring).toBe(true);
    expect(typeof encoded.recurrenceRule).toBe("string");
    expect(JSON.parse(encoded.recurrenceRule as string).frequency).toBe("WEEKLY");
  });

  it("createNextRecurringInstance advances dueDate by frequency", () => {
    const base = new Date("2026-06-01T12:00:00.000Z");
    const next = createNextRecurringInstance({ dueDate: base, startDate: null }, {
      frequency: "DAILY",
      interval: 1,
    });
    expect(next).not.toBeNull();
    expect(next!.dueDate.getUTCDate()).toBe(2);
  });
});
