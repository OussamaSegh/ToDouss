import { describe, expect, it } from "vitest";
import {
  CALENDAR_WEEK_STARTS_ON,
  clipSpanToWeek,
  endOfWeek,
  layoutWeekSegments,
  startOfDay,
  startOfWeek,
  taskDateSpan,
} from "./calendar-utils";
import type { CalendarTask } from "./calendar-utils";

function task(partial: Pick<CalendarTask, "id" | "title" | "priority"> & Partial<CalendarTask>): CalendarTask {
  return {
    id: partial.id,
    title: partial.title,
    priority: partial.priority,
    status: partial.status ?? "TODO",
    startDate: partial.startDate ?? null,
    dueDate: partial.dueDate ?? null,
    project: partial.project ?? null,
  } as CalendarTask;
}

describe("calendar-utils", () => {
  it("taskDateSpan normalizes start/due and single-date cases", () => {
    expect(taskDateSpan(task({ id: "1", title: "a", priority: "P4", startDate: null, dueDate: null }))).toBeNull();

    const d0 = new Date(2026, 2, 10, 15, 0, 0);
    const single = taskDateSpan(task({ id: "1", title: "a", priority: "P4", dueDate: d0 }));
    expect(single).toEqual({
      start: startOfDay(d0),
      end: startOfDay(d0),
    });

    const s = new Date("2026-03-12");
    const e = new Date("2026-03-10");
    const swapped = taskDateSpan(task({ id: "2", title: "b", priority: "P4", startDate: s, dueDate: e }));
    expect(swapped).not.toBeNull();
    expect(swapped!.start.getTime()).toBeLessThanOrEqual(swapped!.end.getTime());
  });

  it("clipSpanToWeek maps columns within Monday-first week", () => {
    const weekStart = startOfWeek(new Date("2026-03-09"), { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
    const clipped = clipSpanToWeek(
      {
        start: new Date("2026-03-10"),
        end: new Date("2026-03-11"),
      },
      weekStart,
      weekEnd,
    );
    expect(clipped).toEqual({ startCol: 1, endCol: 2 });
  });

  it("layoutWeekSegments assigns non-overlapping tracks", () => {
    const weekStart = startOfWeek(new Date("2026-03-09"), { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
    const a = task({
      id: "a",
      title: "overlap-a",
      priority: "P4",
      startDate: new Date("2026-03-10"),
      dueDate: new Date("2026-03-11"),
    });
    const b = task({
      id: "b",
      title: "overlap-b",
      priority: "P3",
      startDate: new Date("2026-03-10"),
      dueDate: new Date("2026-03-10"),
    });
    const laid = layoutWeekSegments([a, b], weekStart);
    expect(laid).toHaveLength(2);
    const byId = Object.fromEntries(laid.map((s) => [s.task.id, s.track]));
    expect(byId["a"] ?? byId["b"]).toBeDefined();
    expect(new Set(laid.map((s) => s.track)).size).toBeGreaterThan(1);
  });
});
