# UI Token V2 Migration Guide

This document maps legacy styling patterns to the semantic token system introduced in Phase UI/Design.

## Token Groups

- `--surface-*`: base/elevated/overlay surfaces
- `--text-*`: primary/secondary/muted/inverse
- `--border-*`: subtle/default/strong
- `--state-*`: success/warn/error/info foreground/background/border
- spacing/radius/shadow/motion aliases for consistency

## Migration Matrix

- `bg-background` -> `bg-[var(--surface-base)]`
- `bg-card` -> `bg-[var(--surface-elevated)]`
- `text-foreground` -> `text-[var(--text-primary)]`
- `text-muted-foreground` -> `text-[var(--text-muted)]`
- `border-border` -> `border-[var(--border-default)]`
- one-off red/yellow/blue semantic state colors -> `--state-error|warn|info-*` tokens

## Backward Compatibility

Legacy variables remain intact while components gradually migrate to semantic aliases. New or refactored components should prefer V2 tokens.

## Icon Usage Rules

- Prefer `UiIcon` semantic names over direct icon imports in app code.
- Use custom icons only through the registry (`custom-icons.tsx`) and ensure:
  - `currentColor` rendering
  - consistent 16/20/24 viewbox scaling
  - no hardcoded theme colors

