# ToDouss

**ToDouss** is a multi-tenant workspace app for todos and lightweight project management — list, board, calendar, timeline, and table views, with collaboration features and optimistic UI updates across a type-safe Next.js + tRPC stack.

This repository is **open source** under the [MIT License](LICENSE). Fork it, run it locally, and adapt it for your team or product.

---

## Highlights

- **Workspaces & projects** — Each tenant is a workspace; tasks live in projects with labels, priorities, statuses, due dates, and recurrence.
- **Multiple views** — Switch between list, Kanban-style board (drag-and-drop), calendar, timeline, and table views without losing context.
- **Fast UX** — TanStack Query caches server state with **optimistic updates** on task mutations; keyboard shortcuts and a command palette for power users.
- **Collaboration** — Comments and @mentions (where configured), invitations, notifications, and **Pusher**-backed realtime updates scoped per workspace/task.
- **Auth** — **[Clerk](https://clerk.com)** for authentication; DB user sync handled in the API layer.
- **Type-safe API** — **[tRPC](https://trpc.io)** routers with shared **[Zod](https://zod.dev)** schemas in `@todouss/validators`.
- **Modern UI** — Next.js App Router, Tailwind CSS, shared primitives in `@todouss/ui` (extended shadcn-style patterns).

Roadmap-oriented features (Stripe billing, Resend email, Workers, integrations) may be partly scaffolded via env vars; core task and workspace flows target local development today.

---

## Monorepo layout

| Path | Purpose |
|------|---------|
| `apps/web` | Next.js 16 application (App Router, RSC, Turbopack in dev). |
| `apps/workers` | Background workers (planned / staged for BullMQ). |
| `packages/db` | Prisma schema & generated client (`@todouss/db`). |
| `packages/trpc` | tRPC routers, context, and server procedures (`@todouss/trpc`). |
| `packages/ui` | Shared UI components & tokens (`@todouss/ui`). |
| `packages/validators` | Zod schemas shared by client & server (`@todouss/validators`). |
| `tooling/*` | Shared ESLint config and TypeScript bases. |

**Multi-tenancy rule (important):** any procedure or query touching workspace-owned data must be scoped by `workspaceId` and routed through validated membership (see `workspaceProcedure` in `@todouss/trpc`).

---

## Requirements

- **Node.js** ≥ 20  
- **pnpm** ≥ 10 (`corepack enable` then `corepack prepare pnpm@10.33.2 --activate`, or install pnpm per [pnpm installation](https://pnpm.io/installation))

PostgreSQL-compatible database (local Postgres or **Supabase** are typical).

---

## Quick start

```bash
# Clone (use your fork or this repo’s HTTPS/SSH URL)
git clone https://github.com/<owner>/ToDouss.git
cd ToDouss

# Dependencies
pnpm install

# Env (copy and fill secrets — never commit .env*.local)
cp .env.example .env.local

# Prisma client + schema apply (development)
pnpm db:generate
pnpm db:push
```

Run the web app:

```bash
pnpm dev
```

Then open **[http://localhost:3000](http://localhost:3000)** (or the URL printed by Next.js).

To run **only** the web package:

```bash
pnpm --filter @todouss/web dev
```

---

## Environment variables

All variables are documented in [`.env.example`](.env.example). Minimum for a usable local shell:

| Area | Typical keys |
|------|----------------|
| Database | `DATABASE_URL`, `DIRECT_URL` |
| Auth | `NEXT_PUBLIC_*` Clerk URLs, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` |

Optional integrations (stripe, Pusher realtime, Redis/QStash, R2, Resend, PostHog, Sentry) are listed with placeholders until you enable those features.

Never commit `.env`, `.env.local`, or production secrets — they are ignored by `.gitignore`.

---

## Root scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Turborepo: start dev tasks across packages that define `dev`. |
| `pnpm build` | Production build (dependency order via Turbo). |
| `pnpm lint` | Lint packages that expose a `lint` task. |
| `pnpm typecheck` | Typecheck across the monorepo. |
| `pnpm test` | Run tests where configured. |
| `pnpm format` | Prettier on common file types. |
| `pnpm db:generate` | Generate Prisma client. |
| `pnpm db:push` | Push schema to DB (dev-friendly; use `db:migrate` for production migrations). |
| `pnpm db:migrate` | Run Prisma migrations. |
| `pnpm db:studio` | Open Prisma Studio. |
| `pnpm clean` | Turbo clean; root script may use Unix `find` — on Windows use per-package cleans if needed. |

---

## PWA & icons

The web app ships a web app manifest and static icons under `apps/web/public/`. To regenerate PNG icons from the SVG mark, see `scripts/generate_pwa_icons.py` (requires a local Python environment with dependencies noted in that script, if any).

---

## Deploying to Vercel

This repo pins **pnpm 10** (`packageManager` + `engines.pnpm` in the root `package.json`) and uses **lockfile v9**. Vercel’s default pnpm is older, so installs are driven by **Corepack** via `vercel.json`.

1. **Node.js 20+** — In the Vercel project: **Settings → General → Node.js Version** → `20.x` (or newer LTS you support).
2. **Root Directory** (choose one and keep it consistent with which `vercel.json` applies):
   - **Repository root** (`.`) — uses the root [`vercel.json`](vercel.json). Set the **Framework Preset** to Next.js only if Vercel correctly detects `apps/web`; you may need a custom **Build Command** such as `pnpm exec turbo run build --filter=@todouss/web` and the correct app root per [Vercel’s Turborepo guide](https://vercel.com/docs/monorepos/turborepo).
   - **`apps/web`** (recommended for a single Next app) — uses [`apps/web/vercel.json`](apps/web/vercel.json). Install runs from the monorepo root (`cd ../..`) so workspaces and the lockfile resolve correctly.
3. **Environment variables** — Add production values from [`.env.example`](.env.example) (at least `DATABASE_URL`, Clerk keys, and `NEXT_PUBLIC_APP_URL` pointing at your Vercel URL).

The install step runs `pnpm install --frozen-lockfile` and then `pnpm db:generate` so Prisma Client is present before `next build`. Apply schema changes in production with your chosen workflow (`prisma migrate deploy` in CI, Supabase migrations, etc.).

---

## Contributing

Contributions are welcome.

1. **Issues & PRs** — Open an issue for larger changes; keep pull requests focused and described clearly.  
2. **Consistency** — Match existing patterns (tRPC procedures, workspace scoping, Zod schemas in `@todouss/validators`, optimistic mutation flow for tasks).  
3. **Checks** — Run `pnpm lint` and `pnpm typecheck` before opening a PR.  
4. **License** — By contributing, you agree your contributions are licensed under the same MIT terms as this project.

If you fork for a private/commercial derivative, attribution under the MIT License is still required — see [LICENSE](LICENSE).

---

## Security

Do not expose database URLs, Clerk keys, or Stripe webhooks in issues or screenshots.  

If you discover a vulnerability, please report it responsibly via GitHub Security Advisories (or contact maintainers privately if that channel is unavailable).

---

## License

Distributed under the **MIT License**. See [LICENSE](LICENSE).

---

## Acknowledgments

Built with [Next.js](https://nextjs.org), [Prisma](https://www.prisma.io), [tRPC](https://trpc.io), [Clerk](https://clerk.com), [TanStack Query](https://tanstack.com/query), and the broader OSS ecosystem listed in package manifests.
