"use client";

import {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
  type MutableRefObject,
} from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  useDndMonitor,
  type DragEndEvent,
} from "@dnd-kit/core";
import { cn, UiButton } from "@todouss/ui";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Columns3,
  Sun,
  List,
  Download,
  Plus,
} from "lucide-react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfWeek,
  differenceInCalendarDays,
} from "date-fns";
import { trpc } from "@/lib/trpc/provider";
import { useWorkspace } from "@/lib/workspace-context";
import type { AdvancedTaskFilters } from "@/components/tasks/advanced-filter-toolbar";
import { trpcFiltersFromAdvanced } from "@/lib/task-filters";
import { useUpdateTask } from "@/hooks/use-task-mutations";
import { useTaskStore } from "@/stores/task-store";
import { QuickAdd } from "@/components/tasks/quick-add";
import {
  type CalendarTask,
  type CalendarColorBy,
  CALENDAR_WEEK_STARTS_ON,
  monthWeekStarts,
  layoutWeekSegments,
  taskDateSpan,
  taskBarColorClass,
  taskBarStyle,
  spanIntersectsRange,
} from "@/lib/calendar-utils";

export type CalendarMode = "month" | "week" | "day" | "agenda";

interface CalendarViewProps {
  /** Omit for workspace-wide (all visible projects). */
  projectId?: string;
  advancedFilters?: AdvancedTaskFilters;
}

function weekdayLabels(): string[] {
  const base = startOfWeek(new Date(2024, 5, 3), { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
  return eachDayOfInterval({ start: base, end: addDays(base, 6) }).map((d) => format(d, "EEE"));
}

function droppableDayId(d: Date) {
  return `cal-day-${format(startOfDay(d), "yyyy-MM-dd")}`;
}

function parseDayDropId(id: string | undefined | null): Date | null {
  if (!id?.startsWith("cal-day-")) return null;
  const ymd = id.slice("cal-day-".length);
  const [y, m, day] = ymd.split("-").map(Number);
  if (!y || !m || !day) return null;
  return startOfDay(new Date(y, m - 1, day));
}

function RecordDragEndedAt({ atRef }: { atRef: MutableRefObject<number> }) {
  useDndMonitor({
    onDragEnd() {
      atRef.current = Date.now();
    },
    onDragCancel() {
      atRef.current = Date.now();
    },
  });
  return null;
}

function reschedulePatch(task: CalendarTask, targetDay: Date): {
  dueDate?: Date | null;
  startDate?: Date | null;
} {
  const oldDue = task.dueDate ? new Date(task.dueDate) : null;
  const oldStart = task.startDate ? new Date(task.startDate) : null;
  const t0 = startOfDay(targetDay);
  if (oldDue && oldStart) {
    const dur = Math.max(0, differenceInCalendarDays(startOfDay(oldDue), startOfDay(oldStart)));
    const newStart = addDays(t0, -dur);
    return {
      dueDate: preserveTime(oldDue, t0),
      startDate: preserveTime(oldStart, newStart),
    };
  }
  if (oldDue) {
    return { dueDate: preserveTime(oldDue, t0) };
  }
  if (oldStart) {
    return { startDate: preserveTime(oldStart, t0) };
  }
  return { dueDate: t0 };
}

function preserveTime(source: Date, newDay: Date): Date {
  const next = new Date(newDay);
  next.setHours(source.getHours(), source.getMinutes(), source.getSeconds(), 0);
  return next;
}

function DroppableDaySurface({
  day,
  isOutMonth,
  children,
  onDoubleClick,
  ariaLabel,
  footer,
}: {
  day: Date;
  isOutMonth: boolean;
  children: React.ReactNode;
  onDoubleClick: () => void;
  ariaLabel: string;
  footer?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: droppableDayId(day),
    data: { day },
  });
  return (
    <div
      ref={setNodeRef}
      role="gridcell"
      aria-label={ariaLabel}
      onDoubleClick={(e) => {
        e.preventDefault();
        onDoubleClick();
      }}
      className={cn(
        "flex flex-col min-h-[88px] border-r border-border/80 bg-background px-0.5 pt-1 pb-1 transition-colors last:border-r-0",
        isOutMonth && "bg-muted/20 text-muted-foreground",
        isOver && "bg-primary/10",
      )}
    >
      {children}
      {footer ? <div className="mt-auto px-0.5">{footer}</div> : null}
    </div>
  );
}

function DayHiddenSummary({
  day,
  hiddenTasks,
  onOpenTask,
  lastDragEndedAt,
}: {
  day: Date;
  hiddenTasks: CalendarTask[];
  onOpenTask: (id: string) => void;
  lastDragEndedAt: MutableRefObject<number>;
}) {
  const [open, setOpen] = useState(false);
  const d0 = startOfDay(day);
  const forDay = hiddenTasks.filter((t) => {
    const span = taskDateSpan(t);
    if (!span) return false;
    return d0 >= startOfDay(span.start) && d0 <= startOfDay(span.end);
  });
  if (forDay.length === 0) return null;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full truncate rounded bg-muted/80 px-0.5 text-[10px] font-medium text-primary hover:bg-muted"
      >
        +{forDay.length} more
      </button>
      {open ? (
        <ul className="absolute left-0 right-0 top-full z-20 mt-0.5 max-h-36 overflow-auto rounded border border-border bg-popover py-1 shadow-md">
          {forDay.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className="w-full truncate px-2 py-1 text-left text-xs hover:bg-muted/60"
                onClick={() => {
                  if (Date.now() - lastDragEndedAt.current < 250) return;
                  onOpenTask(t.id);
                  setOpen(false);
                }}
              >
                {t.title}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function DraggableTaskBar({
  task,
  colorBy,
  style,
  onOpen,
  dragDisabled,
}: {
  task: CalendarTask;
  colorBy: CalendarColorBy;
  style: React.CSSProperties;
  onOpen: () => void;
  dragDisabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `cal-task-${task.id}`,
    disabled: dragDisabled,
    data: { task },
  });

  const cls = taskBarColorClass(task, colorBy);
  const inline = taskBarStyle(task, colorBy);

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      style={{
        ...style,
        transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
        opacity: isDragging ? 0.85 : 1,
        ...inline,
      }}
      className={cn(
        "absolute z-10 h-5 truncate rounded px-1 text-left text-[11px] font-medium shadow-sm ring-1 ring-black/5",
        cls,
        isDragging && "cursor-grabbing z-20",
        !isDragging && "cursor-grab",
      )}
      title={task.title}
    >
      {task.title}
    </button>
  );
}

function MonthWeekRow({
  weekStart,
  anchorMonth,
  tasks,
  colorBy,
  onOpenTask,
  openQuickAdd,
  lastDragEndedAt,
}: {
  weekStart: Date;
  anchorMonth: Date;
  tasks: CalendarTask[];
  colorBy: CalendarColorBy;
  onOpenTask: (id: string) => void;
  openQuickAdd: (day: Date, hasTime: boolean) => void;
  lastDragEndedAt: MutableRefObject<number>;
}) {
  const days = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6),
  });
  const segments = useMemo(() => layoutWeekSegments(tasks, weekStart), [tasks, weekStart]);
  const MAX_VISIBLE_TRACKS = 5;
  const hiddenTasks = [
    ...new Map(
      segments
        .filter((s) => s.track >= MAX_VISIBLE_TRACKS)
        .map((s) => [s.task.id, s.task] as const),
    ).values(),
  ];
  const visibleSegments = segments.filter((s) => s.track < MAX_VISIBLE_TRACKS);
  const visibleMaxTrack = visibleSegments.length
    ? Math.max(...visibleSegments.map((s) => s.track))
    : -1;
  const barAreaHeight =
    visibleMaxTrack >= 0
      ? (visibleMaxTrack + 1) * 22 + 4
      : hiddenTasks.length > 0
        ? 8
        : 4;

  return (
    <div className="relative border-b border-border">
      <div className="grid grid-cols-7 gap-px bg-border">
        {days.map((day) => (
          <DroppableDaySurface
            key={day.toISOString()}
            day={day}
            isOutMonth={!isSameMonth(day, anchorMonth)}
            onDoubleClick={() => openQuickAdd(day, false)}
            ariaLabel={format(day, "EEEE, MMMM d, yyyy")}
            footer={
              hiddenTasks.length > 0 ? (
                <DayHiddenSummary
                  day={day}
                  hiddenTasks={hiddenTasks}
                  onOpenTask={onOpenTask}
                  lastDragEndedAt={lastDragEndedAt}
                />
              ) : null
            }
          >
            <div className="flex justify-end px-1">
              <span
                className={cn(
                  "text-xs font-medium tabular-nums",
                  isSameDay(day, new Date()) && "text-primary font-semibold",
                )}
              >
                {format(day, "d")}
              </span>
            </div>
          </DroppableDaySurface>
        ))}
      </div>
      <div
        className="relative mx-0.5"
        style={{ height: barAreaHeight, marginTop: -barAreaHeight + 4 }}
      >
        {visibleSegments.map((seg) => {
          const left = (seg.startCol / 7) * 100;
          const width = ((seg.endCol - seg.startCol + 1) / 7) * 100;
          return (
            <DraggableTaskBar
              key={`${seg.task.id}-${weekStart.toISOString()}`}
              task={seg.task}
              colorBy={colorBy}
              onOpen={() => {
                if (Date.now() - lastDragEndedAt.current < 250) return;
                onOpenTask(seg.task.id);
              }}
              style={{
                left: `${left}%`,
                width: `${width}%`,
                top: seg.track * 22,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function tasksInRangeForAgenda(tasks: CalendarTask[], from: Date, to: Date) {
  return tasks.filter((t) => {
    const span = taskDateSpan(t);
    if (!span) return false;
    return spanIntersectsRange(span, from, to);
  });
}

export function CalendarView({ projectId, advancedFilters }: CalendarViewProps) {
  const workspace = useWorkspace();
  const advQ = trpcFiltersFromAdvanced(
    advancedFilters ?? { assigneeId: [], labelIds: [], status: [], priority: [] },
  );
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [mode, setMode] = useState<CalendarMode>("month");
  const [colorBy, setColorBy] = useState<CalendarColorBy>("project");
  const openDetail = useTaskStore((s) => s.openDetail);
  const updateTask = useUpdateTask();
  const lastDragEndedAt = useRef(0);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddDay, setQuickAddDay] = useState<Date | null>(null);
  const [quickAddTimed, setQuickAddTimed] = useState(false);
  const quickAddSlotKey = quickAddDay ? format(quickAddDay, "yyyy-MM-dd") + (quickAddTimed ? "t" : "") : "";

  const range = useMemo(() => {
    if (mode === "month") {
      const from = startOfWeek(startOfDay(new Date(anchor.getFullYear(), anchor.getMonth(), 1)), {
        weekStartsOn: CALENDAR_WEEK_STARTS_ON,
      });
      const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
      const to = endOfWeek(startOfDay(monthEnd), { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
      return { from, to };
    }
    if (mode === "week") {
      const from = startOfWeek(anchor, { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
      const to = endOfWeek(anchor, { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
      return { from, to };
    }
    if (mode === "day") {
      const d = startOfDay(anchor);
      return { from: d, to: d };
    }
    const from = startOfWeek(anchor, { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
    const to = endOfWeek(anchor, { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
    return { from, to };
  }, [anchor, mode]);

  const { data: tasks = [], isLoading } = trpc.task.calendarRange.useQuery({
    workspaceId: workspace.id,
    projectId,
    from: range.from,
    to: range.to,
    includeCompleted: true,
    ...advQ,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const onDragEnd = useCallback(
    (e: DragEndEvent) => {
      const taskId = String(e.active.id).replace(/^cal-task-/, "");
      const overId = e.over?.id?.toString() ?? null;
      const day = parseDayDropId(overId);
      if (!day || !taskId) return;
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const patch = reschedulePatch(task, day);
      updateTask.mutate({
        id: taskId,
        workspaceId: workspace.id,
        ...patch,
      });
    },
    [tasks, updateTask, workspace.id],
  );

  const weekStarts = useMemo(() => monthWeekStarts(anchor), [anchor]);

  const openQuickAdd = useCallback((day: Date, hasTime: boolean) => {
    setQuickAddDay(day);
    setQuickAddTimed(hasTime);
    setQuickAddOpen(true);
  }, []);

  const headerTitle = useMemo(() => {
    if (mode === "month") return format(anchor, "MMMM yyyy");
    if (mode === "week") {
      const fs = startOfWeek(anchor, { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
      const fe = endOfWeek(anchor, { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
      return `${format(fs, "MMM d")} – ${format(fe, "MMM d, yyyy")}`;
    }
    if (mode === "day") return format(anchor, "EEEE, MMMM d, yyyy");
    return `${format(range.from, "MMM d")} – ${format(range.to, "MMM d, yyyy")}`;
  }, [anchor, mode, range.from, range.to]);

  const shiftAnchor = useCallback(
    (delta: number) => {
      setAnchor((a) => {
        if (mode === "month") return addMonths(a, delta);
        if (mode === "week") return addDays(a, delta * 7);
        if (mode === "day") return addDays(a, delta);
        return addDays(a, delta * 7);
      });
    },
    [mode],
  );

  const labels = useMemo(() => weekdayLabels(), []);

  const agendaTasks = useMemo(() => {
    const list = tasksInRangeForAgenda(tasks, range.from, range.to);
    return [...list].sort((a, b) => {
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return ad - bd;
    });
  }, [tasks, range.from, range.to]);

  const HOUR_START = 6;
  const HOUR_END = 22;
  const hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => i + HOUR_START);

  useEffect(() => {
    function onKey(ev: globalThis.KeyboardEvent) {
      if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) return;
      if (ev.key === "ArrowLeft") shiftAnchor(-1);
      if (ev.key === "ArrowRight") shiftAnchor(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shiftAnchor]);

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <RecordDragEndedAt atRef={lastDragEndedAt} />
      <div
        className="flex flex-col gap-3 p-4 outline-none"
        tabIndex={0}
        role="application"
        aria-label="Calendar"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-md border border-border p-0.5">
              <UiButton
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 px-0"
                aria-label="Previous"
                onClick={() => shiftAnchor(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </UiButton>
              <UiButton type="button" size="sm" variant="ghost" onClick={() => setAnchor(startOfDay(new Date()))}>
                Today
              </UiButton>
              <UiButton
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 px-0"
                aria-label="Next"
                onClick={() => shiftAnchor(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </UiButton>
            </div>
            <h2 className="text-lg font-semibold tabular-nums">{headerTitle}</h2>
            {isLoading ? <span className="text-xs text-muted-foreground">Loading…</span> : null}
            <UiButton
              type="button"
              size="sm"
              variant="primary"
              className="gap-1"
              onClick={() => openQuickAdd(startOfDay(new Date()), false)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add task
            </UiButton>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md border border-border p-0.5">
              <ViewModeBtn
                active={mode === "month"}
                onClick={() => setMode("month")}
                icon={<LayoutGrid className="h-3.5 w-3.5" />}
                label="Month"
              />
              <ViewModeBtn
                active={mode === "week"}
                onClick={() => setMode("week")}
                icon={<Columns3 className="h-3.5 w-3.5" />}
                label="Week"
              />
              <ViewModeBtn
                active={mode === "day"}
                onClick={() => setMode("day")}
                icon={<Sun className="h-3.5 w-3.5" />}
                label="Day"
              />
              <ViewModeBtn
                active={mode === "agenda"}
                onClick={() => setMode("agenda")}
                icon={<List className="h-3.5 w-3.5" />}
                label="Agenda"
              />
            </div>
            <select
              value={colorBy}
              onChange={(e) => setColorBy(e.target.value as CalendarColorBy)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              aria-label="Color tasks by"
            >
              <option value="project">Color: project</option>
              <option value="priority">Color: priority</option>
            </select>
            <a
              href={`/api/ical/${workspace.slug}${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""}`}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-muted/60"
            >
              <Download className="h-3.5 w-3.5" />
              Export .ics
            </a>
          </div>
        </div>

        {quickAddOpen && quickAddDay ? (
          <QuickAdd
            key={quickAddSlotKey}
            workspaceId={workspace.id}
            projectId={projectId}
            initialDueDate={quickAddDay}
            initialDueTime={quickAddTimed}
            onClose={() => {
              setQuickAddOpen(false);
              setQuickAddDay(null);
            }}
            className="mx-0"
          />
        ) : null}

        {mode === "month" && (
          <div
            className="overflow-hidden rounded-lg border border-border"
            role="grid"
            aria-label="Month view"
          >
            <div className="grid grid-cols-7 gap-px bg-border border-b border-border text-center text-[11px] font-medium text-muted-foreground">
              {labels.map((l) => (
                <div key={l} className="bg-muted/40 py-2">
                  {l}
                </div>
              ))}
            </div>
            {weekStarts.map((ws) => (
              <MonthWeekRow
                key={ws.toISOString()}
                weekStart={ws}
                anchorMonth={anchor}
                tasks={tasks}
                colorBy={colorBy}
                  onOpenTask={openDetail}
                  openQuickAdd={openQuickAdd}
                  lastDragEndedAt={lastDragEndedAt}
                />
            ))}
          </div>
        )}

        {mode === "week" && (
          <WeekTimeGrid
            anchor={anchor}
            tasks={tasks}
            colorBy={colorBy}
            openDetail={openDetail}
            lastDragEndedAt={lastDragEndedAt}
            hours={hours}
            openQuickAdd={openQuickAdd}
          />
        )}

        {mode === "day" && (
          <DayTimeGrid
            day={startOfDay(anchor)}
            tasks={tasks}
            colorBy={colorBy}
            openDetail={openDetail}
            lastDragEndedAt={lastDragEndedAt}
            hours={hours}
            openQuickAdd={openQuickAdd}
          />
        )}

        {mode === "agenda" && (
          <div className="rounded-lg border border-border divide-y divide-border max-w-2xl">
            {agendaTasks.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No tasks in this range.</p>
            ) : (
              agendaTasks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openDetail(t.id)}
                  className="flex w-full gap-3 p-3 text-left text-sm hover:bg-muted/40"
                >
                  <span className="w-28 shrink-0 text-xs text-muted-foreground tabular-nums">
                    {t.dueDate
                      ? format(new Date(t.dueDate), t.dueTime ? "MMM d · HH:mm" : "MMM d")
                      : "—"}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{t.title}</span>
                  {t.project?.name ? (
                    <span className="shrink-0 text-xs text-muted-foreground">{t.project.name}</span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </DndContext>
  );
}

function ViewModeBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded px-2 text-xs",
        active ? "bg-primary text-primary-foreground" : "hover:bg-muted/70 text-muted-foreground",
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function WeekTimeGrid({
  anchor,
  tasks,
  colorBy,
  openDetail,
  lastDragEndedAt,
  hours,
  openQuickAdd,
}: {
  anchor: Date;
  tasks: CalendarTask[];
  colorBy: CalendarColorBy;
  openDetail: (id: string) => void;
  lastDragEndedAt: MutableRefObject<number>;
  hours: number[];
  openQuickAdd: (d: Date, timed: boolean) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(anchor, { weekStartsOn: CALENDAR_WEEK_STARTS_ON }),
    end: endOfWeek(anchor, { weekStartsOn: CALENDAR_WEEK_STARTS_ON }),
  });
  const slotH = 40;

  const allDayTasks = tasks.filter((t) => {
    if (t.dueTime) return false;
    return taskDateSpan(t) !== null;
  });
  const timedTasks = tasks.filter((t) => t.dueTime && t.dueDate);

  return (
    <div className="overflow-auto rounded-lg border border-border">
      <div className="min-w-[720px]">
        <div className="grid border-b border-border" style={{ gridTemplateColumns: `48px repeat(7, 1fr)` }}>
          <div />
          {days.map((d) => (
            <div key={d.toISOString()} className="border-l border-border px-1 py-2 text-center text-xs font-medium">
              <div className="text-muted-foreground">{format(d, "EEE")}</div>
              <div className={cn("text-base", isSameDay(d, new Date()) && "text-primary font-semibold")}>
                {format(d, "d")}
              </div>
            </div>
          ))}
        </div>
        <div className="grid" style={{ gridTemplateColumns: `48px repeat(7, 1fr)` }}>
          <div className="text-[10px] text-muted-foreground p-1">All day</div>
          {days.map((d) => (
            <DroppableWeekAllDay key={d.toISOString()} day={d} tasks={allDayTasks} colorBy={colorBy} openDetail={openDetail} lastDragEndedAt={lastDragEndedAt} openQuickAdd={openQuickAdd} />
          ))}
        </div>
        <div className="grid" style={{ gridTemplateColumns: `48px repeat(7, 1fr)` }}>
          <div className="relative border-t border-border text-[10px] text-muted-foreground">
            {hours.map((h) => (
              <div key={h} style={{ height: slotH }} className="border-b border-border/60 pr-1 text-right">
                {format(new Date(2000, 0, 1, h), "h a")}
              </div>
            ))}
          </div>
          {days.map((d) => (
            <WeekDayColumn
              key={d.toISOString()}
              day={d}
              hours={hours}
              slotH={slotH}
              timedTasks={timedTasks}
              colorBy={colorBy}
              openDetail={openDetail}
              lastDragEndedAt={lastDragEndedAt}
              openQuickAdd={openQuickAdd}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DroppableWeekAllDay({
  day,
  tasks,
  colorBy,
  openDetail,
  lastDragEndedAt,
  openQuickAdd,
}: {
  day: Date;
  tasks: CalendarTask[];
  colorBy: CalendarColorBy;
  openDetail: (id: string) => void;
  lastDragEndedAt: MutableRefObject<number>;
  openQuickAdd: (d: Date, t: boolean) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: droppableDayId(day) });
  const dayTasks = tasks.filter((t) => {
    if (t.dueTime) return false;
    const span = taskDateSpan(t);
    if (!span) return false;
    const d0 = startOfDay(day);
    return d0 >= startOfDay(span.start) && d0 <= startOfDay(span.end);
  });
  return (
    <div
      ref={setNodeRef}
      onDoubleClick={() => openQuickAdd(day, false)}
      className={cn(
        "min-h-10 border-l border-border bg-muted/10 p-0.5 space-y-0.5",
        isOver && "bg-primary/10",
      )}
    >
      {dayTasks.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => {
            if (Date.now() - lastDragEndedAt.current < 250) return;
            openDetail(t.id);
          }}
          style={taskBarStyle(t, colorBy)}
          className={cn(
            "block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium",
            taskBarColorClass(t, colorBy),
          )}
        >
          {t.title}
        </button>
      ))}
    </div>
  );
}

function WeekDayColumn({
  day,
  hours,
  slotH,
  timedTasks,
  colorBy,
  openDetail,
  lastDragEndedAt,
  openQuickAdd,
}: {
  day: Date;
  hours: number[];
  slotH: number;
  timedTasks: CalendarTask[];
  colorBy: CalendarColorBy;
  openDetail: (id: string) => void;
  lastDragEndedAt: MutableRefObject<number>;
  openQuickAdd: (d: Date, timed: boolean) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: droppableDayId(day) });
  const dayTimed = timedTasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), day));

  return (
    <div ref={setNodeRef} className={cn("relative border-l border-border", isOver && "bg-primary/5")}>
      {hours.map((h) => (
        <div
          key={h}
          style={{ height: slotH }}
          className="border-b border-border/40"
          onDoubleClick={() => {
            const d = new Date(day);
            d.setHours(h, 0, 0, 0);
            openQuickAdd(d, true);
          }}
        />
      ))}
      {dayTimed.map((t) => {
        const dt = new Date(t.dueDate!);
        const minutes = dt.getHours() * 60 + dt.getMinutes();
        const startM = hours[0]! * 60;
        const top = ((minutes - startM) / 60) * slotH;
        return (
          <DraggableTaskBar
            key={t.id}
            task={t}
            colorBy={colorBy}
            dragDisabled={false}
            onOpen={() => {
              if (Date.now() - lastDragEndedAt.current < 250) return;
              openDetail(t.id);
            }}
            style={{
              left: "2%",
              width: "96%",
              top: Math.max(0, top),
              height: 36,
            }}
          />
        );
      })}
    </div>
  );
}

function DayTimeGrid({
  day,
  tasks,
  colorBy,
  openDetail,
  lastDragEndedAt,
  hours,
  openQuickAdd,
}: {
  day: Date;
  tasks: CalendarTask[];
  colorBy: CalendarColorBy;
  openDetail: (id: string) => void;
  lastDragEndedAt: MutableRefObject<number>;
  hours: number[];
  openQuickAdd: (d: Date, timed: boolean) => void;
}) {
  const slotH = 44;
  const allDay = tasks.filter((t) => {
    if (t.dueTime) return false;
    const span = taskDateSpan(t);
    if (!span) return false;
    return spanIntersectsRange(span, startOfDay(day), startOfDay(day));
  });
  const timed = tasks.filter((t) => t.dueTime && t.dueDate && isSameDay(new Date(t.dueDate), day));

  return (
    <div className="overflow-auto rounded-lg border border-border max-w-3xl">
      <div className="border-b border-border p-3">
        <p className="text-sm font-medium">{format(day, "EEEE, MMMM d")}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {allDay.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => openDetail(t.id)}
              style={taskBarStyle(t, colorBy)}
              className={cn(
                "rounded px-2 py-1 text-xs font-medium",
                taskBarColorClass(t, colorBy),
              )}
            >
              {t.title}
            </button>
          ))}
        </div>
      </div>
      <div className="relative">
        {hours.map((h) => (
          <div
            key={h}
            style={{ height: slotH }}
            className="flex border-b border-border/50"
            onDoubleClick={() => {
              const d = new Date(day);
              d.setHours(h, 0, 0, 0);
              openQuickAdd(d, true);
            }}
          >
            <span className="w-14 shrink-0 pr-2 text-right text-[11px] text-muted-foreground">
              {format(new Date(2000, 0, 1, h), "h a")}
            </span>
            <div className="flex-1" />
          </div>
        ))}
        <div className="pointer-events-none absolute left-14 right-0 top-0 h-full">
          {timed.map((t) => {
            const dt = new Date(t.dueDate!);
            const minutes = dt.getHours() * 60 + dt.getMinutes();
            const startM = hours[0]! * 60;
            const top = ((minutes - startM) / 60) * slotH;
            return (
              <div key={t.id} className="pointer-events-auto absolute left-1 right-1" style={{ top }}>
                <DraggableTaskBar
                  task={t}
                  colorBy={colorBy}
                  onOpen={() => {
                    if (Date.now() - lastDragEndedAt.current < 250) return;
                    openDetail(t.id);
                  }}
                  style={{ position: "relative", left: 0, width: "100%", height: 40, top: 0 }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
