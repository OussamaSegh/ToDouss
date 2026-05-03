# ToDouss — AI Coding Context

## Project Overview
ToDouss is a full-stack SaaS todo/project management app built as a pnpm monorepo with Turborepo. It is a multi-tenant application where each tenant is called a "workspace."

## Monorepo Structure

```
apps/web/          # Next.js 16 (App Router, RSC) — main application
apps/workers/      # BullMQ background job workers (future)
packages/db/       # Prisma schema + client (@todouss/db)
packages/trpc/     # tRPC routers + context (@todouss/trpc)
packages/ui/       # Shared component library (@todouss/ui)
packages/validators/ # Zod schemas shared client+server (@todouss/validators)
tooling/tsconfig/  # Shared TypeScript configs
tooling/eslint/    # Shared ESLint flat configs
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
- Plan limits enforced in tRPC middleware before create operations
- Plan definitions: `apps/web/src/lib/stripe/plans.ts`
- FREE: 5 projects, 1 member, 100 MB
- PRO: $8/mo — unlimited projects, 5 GB
- BUSINESS: $16/seat/mo — unlimited everything

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
| Clerk middleware | `apps/web/src/middleware.ts` |
| tRPC API route | `apps/web/src/app/api/trpc/[trpc]/route.ts` |
| tRPC React provider | `apps/web/src/lib/trpc/provider.tsx` |
| App shell | `apps/web/src/components/layout/app-shell.tsx` |
| Sidebar | `apps/web/src/components/layout/sidebar/sidebar.tsx` |
| Workspace layout | `apps/web/src/app/(app)/[workspaceSlug]/layout.tsx` |
| Plan definitions | `apps/web/src/lib/stripe/plans.ts` |

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

# Run type checking across all packages
pnpm typecheck

# Push schema to database (dev only)
pnpm db:push
```

## Environment Variables
Copy `.env.example` to `.env.local` and fill in:
- `DATABASE_URL` + `DIRECT_URL` (Supabase)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET` (from Clerk dashboard → Webhooks)
- All others can be added when implementing each feature

## Implementation Phases
- **Phase 0** ✅ Foundation (monorepo, auth, app shell) — CURRENT
- **Phase 1** Core Task Engine (list/board views, NLP, DnD, optimistic updates)
- **Phase 2** Collaboration (comments, @mentions, real-time, invites)
- **Phase 3** Advanced Views (calendar, timeline, table, filters, recurring)
- **Phase 4** Monetization (Stripe billing, usage limits, pricing page)
- **Phase 5** Email & Onboarding (Resend, BullMQ workers, web push)
- **Phase 6** API & Integrations (REST API, webhooks, Slack, GitHub)
- **Phase 7** Scale & Hardening (Sentry, PostHog, Typesense, i18n)
