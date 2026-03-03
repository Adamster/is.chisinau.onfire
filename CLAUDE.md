# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**is.chisinau.onfire** — a Next.js web app displaying real-time fire incident data for Chișinău, Moldova. Shows a "YES/NO" banner based on whether there was a fire today, with a countdown timer, incident history sidebar, and stats.

## Commands

```bash
pnpm dev            # dev server at localhost:3000
pnpm build          # production build
pnpm typecheck      # tsc --noEmit
pnpm lint           # ESLint
pnpm format         # Prettier write
pnpm test:unit      # run unit tests with coverage
pnpm test:watch     # unit tests in watch mode
pnpm e2e            # Playwright (mobile + tablet + desktop)
pnpm e2e:headed     # Playwright with visible browser
```

## Environment

Copy `.env.example` to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

## Architecture

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · TanStack Query · Supabase · Zod · Vitest · MSW · Playwright

```
app/
  layout.tsx          # Server component — fetches last fire for SSR background image
  page.tsx            # Client component — main UI with real-time countdown (1s interval)
  providers.tsx       # React Query setup + MSW browser worker (non-production only)
src/shared/api/
  fire.ts             # Supabase client, Zod schemas (FireIncidentSchema, FireStatsSchema),
                      # and query functions: getLastFire(), getFireIncidents(), getFireStats()
  config.ts           # env vars
tests/
  unit/               # Vitest unit tests for API functions
  msw/                # Mock Service Worker handlers + server/browser setup
  e2e/                # Playwright specs (playwright.config.ts runs 3 device projects)
```

**Data flow:**
- `app/layout.tsx` calls `getLastFire()` server-side to set the background image on `<body>`
- `app/page.tsx` uses TanStack Query hooks client-side for incident list and stats
- All Supabase responses are validated through Zod schemas before use

## Patterns & Conventions

**API layer:** All new API functions go in `src/shared/api/`, always paired with a Zod schema for the response. No hardcoded URLs — use `NEXT_PUBLIC_API_BASE_URL` or the Supabase client from config.

**Styling:** No UI framework. Uses inline styles and CSS Modules. Mobile-first with breakpoints: 640px (sm), 768px (md), 1024px (lg), 1280px (xl). Use `clamp()` for fluid typography. Interactive targets ≥ 40×40px.

**Responsive:** Every new screen must work at ~375px, ~820px, ~1280px. Lists/cards use CSS Grid scaling from 1 column (mobile) to 2–3 (lg+).

**Testing requirements for new features:**
- Unit test for API functions (route, params, error handling)
- Zod schema for API response including negative cases
- At least one Playwright E2E test running across mobile/tablet/desktop

**Pre-commit hooks (Husky + lint-staged):** ESLint + Prettier run automatically on staged `*.ts/tsx` files.

## CI Pipeline Order

`typecheck` → `lint` → `test:unit` → `build` → `e2e`
