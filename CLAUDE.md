# ToDouss — AI Coding Context

## Project Overview
ToDouss is a full-stack SaaS todo/project management app built as a pnpm monorepo with Turborepo. It is a multi-tenant application where each tenant is called a "workspace."

## Monorepo Structure

```
apps/web/           # Next.js 16 (App Router, RSC) — main application
apps/workers/       # BullMQ workers: reminders, recurring tasks, outbound webhooks
packages/db/        # Prisma schema + client (@todouss/db)
packages/trpc/      # tRPC routers + context (@todouss/trpc)
packages/billing/   # Plan limits + storage labels (@todouss/billing)
packages/storage/   # R2 / S3-compatible presigned uploads (@todouss/storage)
packages/ui/        # Shared component library (@todouss/ui)
packages/validators/# Zod schemas shared client+server (@todouss/validators)
tooling/tsconfig/   # Shared TypeScript configs
tooling/eslint/     # Shared ESLint flat configs
```

## Critical Conventions

### Multi-tenancy (MOST IMPORTANT)
- **Always** use `workspaceProcedure` for any tRPC procedure that touches workspace data
- **Every** database query that touches workspace data must include `workspaceId` in the WHERE clause
- **Never** query tasks, projects, labels, etc. without scoping to a workspace
- Workspace membership is validated by `workspaceProcedure` middleware automatically

### Database & ORM
- Always go through `packages/db` — import from `@todouss/db`
- Never write raw SQL outside of migrations
- Never use `prisma.$queryRaw` without explicit security review
- `sortOrder` uses fractional indexing (Float midpoint): `newOrder = (prevOrder + nextOrder) / 2`
- When gap < `Number.EPSILON * 2`, batch reindex all items in that scope

### tRPC Procedure Hierarchy
```typescript
publicProcedure        // No auth — health checks, landing page data
protectedProcedure     // Clerk session required
workspaceProcedure     // protectedProcedure + workspace membership validated
```

### State Management
- **Server state** → TanStack Query cache (via tRPC hooks)
- **Client UI state** → Zustand stores (`src/stores/`)
- **Never** put server data in Zustand — let TanStack Query own it

### Optimistic Updates (Required for all task mutations)
Every mutating tRPC hook must follow this 5-step pattern:
1. Cancel in-flight queries for affected key
2. Snapshot current cache state for rollback
3. Apply optimistic patch to TanStack Query cache + Zustand store
4. Fire the actual mutation
5. On error: rollback cache + store; on settled: invalidate

### Components
- Base components: shadcn/ui → extended in `packages/ui` → consumed in `apps/web`
- All client components: `"use client"` directive at top
- Server components: No directive needed (default in App Router)

### Validation
- All Zod schemas live in `packages/validators/src/`
- Never duplicate validation — one schema used by both tRPC server AND React Hook Form client
- Import like: `import { createTaskSchema } from "@todouss/validators"`

### Real-Time (Pusher)
- Channel naming: `workspace-{workspaceId}`, `project-{projectId}`, `task-{taskId}`
- Always skip self-events: `if (event.actorId === currentUserId) return;`
- Compare `updatedAt` timestamps to ignore stale events

### Billing & Plans
- Plan limits enforced in tRPC (see `packages/trpc/src/lib/plan-limits.ts`) before relevant create operations
- Plan definitions and formatting: `packages/billing` (re-exported from `apps/web/src/lib/stripe/plans.ts` for UI)
- FREE: 5 projects, 2 members, 100 MB
- PRO: unlimited projects/members, 5 GB
- BUSINESS / ENTERPRISE: unlimited storage

### API keys & webhooks
- REST: `apps/web/src/app/api/v1/tasks/route.ts` — `Authorization: Bearer td_live_…`
- Signed webhook payloads: `packages/trpc/src/lib/dispatch-workspace-webhook.ts` (`X-ToDouss-Signature`, `X-ToDouss-Event`)

### Commit Convention
```
feat: add calendar view to project pages
fix: resolve task reorder gap precision issue
chore: update prisma schema with attachment model
refactor: extract optimistic update pattern to hook
```

## Key File Locations

| What | Where |
|---|---|
| tRPC procedures | `packages/trpc/src/routers/*.ts` |
| Prisma schema | `packages/db/prisma/schema.prisma` |
| DB client | `packages/db/src/client.ts` |
| Clerk proxy (auth edge) | `apps/web/src/proxy.ts` |
| tRPC API route | `apps/web/src/app/api/trpc/[trpc]/route.ts` |
| tRPC React provider | `apps/web/src/lib/trpc/provider.tsx` |
| App shell | `apps/web/src/components/layout/app-shell.tsx` |
| Sidebar | `apps/web/src/components/layout/sidebar/sidebar.tsx` |
| Workspace layout | `apps/web/src/app/(app)/[workspaceSlug]/layout.tsx` |
| Plan module | `packages/billing/src/plans.ts` |
| Workspace settings UI | `apps/web/src/app/(app)/[workspaceSlug]/settings/page.tsx` |
| BullMQ workers entry | `apps/workers/src/index.ts` |

## Running the Project

```bash
# Install all dependencies
pnpm install

# Generate Prisma client (requires packages/db/prisma/schema.prisma)
pnpm db:generate

# Run all dev servers in parallel
pnpm dev

# Run just the Next.js app
pnpm --filter @todouss/web dev

# Background workers (needs REDIS_URL)
pnpm workers:dev

# Unit + integration tests (Turbo runs every package that defines `pnpm test`)
pnpm test

# Run type checking across all packages
pnpm typecheck

# Push schema to database (dev only)
pnpm db:push
```

### Automated tests

- **Unit tests** — Vitest in `packages/billing`, `packages/validators`, `packages/trpc` (library helpers), and `apps/web` (`src/**/*.test.ts`). They do not require a database.
- **`TEST_DATABASE_URL`** — When this is set to a **disposable Postgres** database (never production), integration suites run:
  - `packages/trpc/src/trpc.integration.test.ts` — `createCaller` workspace isolation, plan limits (`project.create`, `invite.create`).
  - `apps/web/src/lib/rest-auth.integration.test.ts` — API key authentication + task `where` scoping with an injected `PrismaClient`.
  If it is unset, those files are skipped so `pnpm test` stays fast locally.
- **CI** — `.github/workflows/ci.yml` starts Postgres, sets `TEST_DATABASE_URL`, runs `pnpm db:generate`, `prisma db push` on the test DB, then `pnpm test` and `pnpm typecheck`.
- **Playwright** — Smoke tests live in `apps/web/e2e/`. Run `pnpm --filter @todouss/web test:e2e` with the same Clerk env vars as dev (`NEXT_PUBLIC_CLERK_*`, `CLERK_SECRET_KEY`). CI does not run Playwright by default; add a job or `@clerk/testing` when you have stable test credentials.

## Environment Variables
Copy `.env.example` to `.env.local` and fill in:
- `DATABASE_URL` + `DIRECT_URL` (Supabase)
- Optional: `TEST_DATABASE_URL` for local integration tests (see Automated tests above)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET` (from Clerk dashboard → Webhooks)
- `REDIS_URL` — TCP Redis URL for `apps/workers` (e.g. `redis://localhost:6379`)
- Stripe, Pusher, R2, Resend keys as needed (see `.env.example`)

## Implementation Phases
- **Phase 0** Foundation — monorepo, Clerk auth, app shell
- **Phase 1** Core task engine — lists, board, optimistic updates, task detail
- **Phase 2** Collaboration — comments, invites, team visibility (`packages/db/src/visibility.ts`)
- **Phase 3** Advanced views — calendar, timeline, table, saved views
- **Phase 4** Monetization — Stripe checkout/portal/webhooks, `packages/billing` limits
- **Phase 5** Background jobs — `apps/workers` (BullMQ), attachments via R2
- **Phase 6** API & integrations — REST v1, API keys, workspace webhooks
- **Phase 7** Scale & hardening — broader tests, Sentry/PostHog, search/i18n (incremental)
