const env = process.env;

function flag(name: string, fallback = true) {
  const raw = env[name];
  if (raw == null) return fallback;
  return raw === "1" || raw.toLowerCase() === "true";
}

export const featureFlags = {
  calendarView: flag("NEXT_PUBLIC_FEATURE_CALENDAR_VIEW", true),
  timelineView: flag("NEXT_PUBLIC_FEATURE_TIMELINE_VIEW", true),
  tableView: flag("NEXT_PUBLIC_FEATURE_TABLE_VIEW", true),
  savedViews: flag("NEXT_PUBLIC_FEATURE_SAVED_VIEWS", true),
  uiShellRefresh: flag("NEXT_PUBLIC_UI_SHELL_REFRESH", true),
  uiTokenV2: flag("NEXT_PUBLIC_UI_TOKEN_V2", true),
  uiIconV2: flag("NEXT_PUBLIC_UI_ICON_V2", true),
  uiPageChromeV2: flag("NEXT_PUBLIC_UI_PAGE_CHROME_V2", true),
};
