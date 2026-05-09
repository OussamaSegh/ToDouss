import type { CSSProperties } from "react";
import {
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addMonths,
  differenceInCalendarDays,
  isWithinInterval,
  isSameMonth,
  format,
  addDays,
} from "date-fns";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@todouss/trpc";

export type CalendarTask = inferRouterOutputs<AppRouter>["task"]["calendarRange"][number];

export type CalendarColorBy = "project" | "priority";

/** Monday-first week (ISO-style); change to 0 for Sunday-first. */
export const CALENDAR_WEEK_STARTS_ON = 1 as const;

export function taskDateSpan(task: Pick<CalendarTask, "startDate" | "dueDate">): {
  start: Date;
  end: Date;
} | null {
  const startRaw = task.startDate ? new Date(task.startDate) : null;
  const dueRaw = task.dueDate ? new Date(task.dueDate) : null;
  if (!startRaw && !dueRaw) return null;
  if (startRaw && dueRaw) {
    const s = startOfDay(startRaw);
    const e = startOfDay(dueRaw);
    return s <= e ? { start: s, end: e } : { start: e, end: s };
  }
  if (dueRaw) {
    const d = startOfDay(dueRaw);
    return { start: d, end: d };
  }
  const s = startOfDay(startRaw!);
  return { start: s, end: s };
}

export function spanIntersectsRange(
  span: { start: Date; end: Date },
  rangeStart: Date,
  rangeEnd: Date,
): boolean {
  return span.start <= endOfDay(rangeEnd) && span.end >= startOfDay(rangeStart);
}

export function clipSpanToWeek(
  span: { start: Date; end: Date },
  weekStart: Date,
  weekEnd: Date,
): { startCol: number; endCol: number } | null {
  const w0 = startOfDay(weekStart);
  const w1 = startOfDay(weekEnd);
  const s = startOfDay(span.start) > w0 ? startOfDay(span.start) : w0;
  const e = startOfDay(span.end) < w1 ? startOfDay(span.end) : w1;
  if (s > e) return null;
  const startCol = differenceInCalendarDays(s, w0);
  const endCol = differenceInCalendarDays(e, w0);
  return { startCol, endCol };
}

export interface WeekSegment {
  task: CalendarTask;
  startCol: number;
  endCol: number;
  track: number;
}

export function layoutWeekSegments(tasks: CalendarTask[], weekStart: Date): WeekSegment[] {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
  const segments: Omit<WeekSegment, "track">[] = [];

  for (const task of tasks) {
    const span = taskDateSpan(task);
    if (!span) continue;
    const clipped = clipSpanToWeek(span, weekStart, weekEnd);
    if (!clipped) continue;
    segments.push({ task, ...clipped });
  }

  segments.sort((a, b) => {
    if (a.startCol !== b.startCol) return a.startCol - b.startCol;
    const lenA = a.endCol - a.startCol;
    const lenB = b.endCol - b.startCol;
    return lenB - lenA;
  });

  const trackEnds: number[] = [];
  const out: WeekSegment[] = [];

  for (const seg of segments) {
    let t = 0;
    while (trackEnds[t] !== undefined && trackEnds[t]! >= seg.startCol) {
      t++;
    }
    trackEnds[t] = seg.endCol;
    out.push({ ...seg, track: t });
  }

  return out;
}

export function monthWeekStarts(anchorMonth: Date): Date[] {
  const monthStart = startOfMonth(anchorMonth);
  const monthEnd = endOfMonth(anchorMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const weeks: Date[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days[i]!);
  }
  return weeks;
}

export function priorityBarClass(priority: string): string {
  switch (priority) {
    case "P1":
      return "bg-red-500/85 text-white";
    case "P2":
      return "bg-orange-500/85 text-white";
    case "P3":
      return "bg-amber-500/90 text-foreground";
    default:
      return "bg-muted text-foreground border border-border/80";
  }
}

export function taskBarColorClass(task: CalendarTask, colorBy: CalendarColorBy): string {
  if (colorBy === "priority") {
    return priorityBarClass(task.priority);
  }
  const hex = task.project?.color;
  if (hex && /^#[0-9A-Fa-f]{6}$/.test(hex)) {
    return "";
  }
  return priorityBarClass(task.priority);
}

export function taskBarStyle(task: CalendarTask, colorBy: CalendarColorBy): CSSProperties {
  if (colorBy === "project" && task.project?.color && /^#[0-9A-Fa-f]{6}$/.test(task.project.color)) {
    return { backgroundColor: task.project.color, color: "#fff" };
  }
  return {};
}

export {
  addMonths,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  isSameMonth,
  isWithinInterval,
  startOfDay,
  endOfDay,
  differenceInCalendarDays,
  startOfMonth,
  endOfMonth,
};
