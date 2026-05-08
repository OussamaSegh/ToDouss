type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface RecurrenceRulePayload {
  frequency: RecurrenceFrequency;
  interval?: number;
  weekdays?: number[];
  dayOfMonth?: number;
  timezone?: string;
  until?: string | Date;
  count?: number;
}

export function parseRecurrenceRule(value: string): RecurrenceRulePayload | null {
  try {
    const parsed = JSON.parse(value) as RecurrenceRulePayload;
    if (!parsed || !parsed.frequency) return null;
    return { ...parsed, interval: parsed.interval ?? 1, timezone: parsed.timezone ?? "UTC" };
  } catch {
    return null;
  }
}

export function buildRecurrenceTaskPayload(input: {
  isRecurring?: boolean;
  recurrenceRule?: RecurrenceRulePayload | null;
  currentParentId?: string | null;
}) {
  if (input.isRecurring === undefined && input.recurrenceRule === undefined) return {};
  const isRecurring = input.isRecurring ?? !!input.recurrenceRule;
  if (!isRecurring) return { isRecurring: false, recurrenceRule: null };
  const rule = input.recurrenceRule ?? undefined;
  if (!rule) return { isRecurring: true };
  return {
    isRecurring: true,
    recurrenceRule: JSON.stringify({ interval: 1, timezone: "UTC", ...rule }),
    recurrenceParentId: input.currentParentId ?? null,
  };
}

export function createNextRecurringInstance(
  task: { dueDate: Date | null; startDate: Date | null },
  rule: RecurrenceRulePayload,
) {
  const base = task.dueDate ?? task.startDate ?? new Date();
  const interval = Math.max(1, rule.interval ?? 1);
  const dueDate = new Date(base);
  const startDate = task.startDate ? new Date(task.startDate) : null;

  switch (rule.frequency) {
    case "DAILY":
      dueDate.setDate(dueDate.getDate() + interval);
      if (startDate) startDate.setDate(startDate.getDate() + interval);
      break;
    case "WEEKLY":
      dueDate.setDate(dueDate.getDate() + interval * 7);
      if (startDate) startDate.setDate(startDate.getDate() + interval * 7);
      break;
    case "MONTHLY":
      dueDate.setMonth(dueDate.getMonth() + interval);
      if (startDate) startDate.setMonth(startDate.getMonth() + interval);
      break;
    case "YEARLY":
      dueDate.setFullYear(dueDate.getFullYear() + interval);
      if (startDate) startDate.setFullYear(startDate.getFullYear() + interval);
      break;
    default:
      return null;
  }

  return { dueDate, startDate };
}
