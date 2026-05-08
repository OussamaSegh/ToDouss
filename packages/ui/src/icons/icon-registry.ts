import {
  Bell,
  Calendar,
  CalendarDays,
  Folder,
  Inbox,
  LayoutGrid,
  List,
  Search,
  Settings,
  Sun,
  Table,
  GanttChartSquare,
  type LucideIcon,
} from "lucide-react";

export type IconName =
  | "inbox"
  | "today"
  | "upcoming"
  | "search"
  | "settings"
  | "project"
  | "notification"
  | "list"
  | "board"
  | "calendar"
  | "timeline"
  | "table";

export const ICON_FALLBACK: IconName = "project";

export const LUCIDE_ICON_REGISTRY: Record<IconName, LucideIcon> = {
  inbox: Inbox,
  today: Sun,
  upcoming: CalendarDays,
  search: Search,
  settings: Settings,
  project: Folder,
  notification: Bell,
  list: List,
  board: LayoutGrid,
  calendar: Calendar,
  timeline: GanttChartSquare,
  table: Table,
};
