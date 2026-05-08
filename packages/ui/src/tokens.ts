export const uiTokens = {
  surface: {
    base: "var(--surface-base)",
    elevated: "var(--surface-elevated)",
    overlay: "var(--surface-overlay)",
  },
  text: {
    primary: "var(--text-primary)",
    secondary: "var(--text-secondary)",
    muted: "var(--text-muted)",
    inverse: "var(--text-inverse)",
  },
  border: {
    subtle: "var(--border-subtle)",
    default: "var(--border-default)",
    strong: "var(--border-strong)",
  },
  state: {
    success: {
      bg: "var(--state-success-bg)",
      fg: "var(--state-success-fg)",
      border: "var(--state-success-border)",
    },
    warn: {
      bg: "var(--state-warn-bg)",
      fg: "var(--state-warn-fg)",
      border: "var(--state-warn-border)",
    },
    error: {
      bg: "var(--state-error-bg)",
      fg: "var(--state-error-fg)",
      border: "var(--state-error-border)",
    },
    info: {
      bg: "var(--state-info-bg)",
      fg: "var(--state-info-fg)",
      border: "var(--state-info-border)",
    },
  },
} as const;

