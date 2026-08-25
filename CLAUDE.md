# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**is.chisinau.onfire** — a Next.js app that answers one question: was there a fire in Chișinău today? Renders a giant YES/NO banner, a live "time since last fire" countdown, an incident sidebar, a monthly bar chart, and month/year counts. Data lives in a single Supabase table, `fire_incidents` (`id`, `datetime`, `photo_url`, `street`).

## Commands

`pnpm` is the package manager, but it is **not always on `PATH`** in non-interactive shells here. If `pnpm` is not found, use `corepack pnpm <script>` or call binaries directly (`./node_modules/.bin/vitest`, `./node_modules/.bin/next`).

```bash
pnpm dev              # dev server at localhost:3000  (NOTE: serves MSW mock data — see below)
pnpm build            # production build
pnpm start            # serve the production build on :3000
pnpm typecheck        # tsc --noEmit
pnpm lint             # eslint .
pnpm format           # prettier --write .
pnpm test:unit        # vitest run --dir tests/unit --coverage
pnpm test:watch       # vitest watch
pnpm e2e              # playwright, all 3 device projects
pnpm e2e:headed       # playwright with a visible browser
pnpm e2e:update       # refresh Playwright snapshots
pnpm msw:init         # regenerate public/mockServiceWorker.js (run automatically by predev)
```

`predev` regenerates the MSW worker; `prebuild` deletes it so it never ships to
production. Playwright browsers are needed for `pnpm e2e`: `pnpm exec playwright
install chromium webkit` (the tablet project is WebKit, the other two Chromium).

Running one test:

```bash
# single unit file / single test by name (`pnpm test` alone is watch mode)
pnpm exec vitest run -c vitest.config.ts tests/unit/fire.test.ts
pnpm exec vitest run -c vitest.config.ts -t "derives month count"
pnpm e2e --project=desktop -g "fire status"   # single e2e test, one device
```

CI order: `typecheck` → `lint` → `test:unit` → `build` → `e2e`.

## Environment

Copy `.env.example` to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
NEXT_PUBLIC_EXTRA_IMAGE_HOSTS=        # optional, comma-separated
```

Supabase is the only backend. (`NEXT_PUBLIC_API_BASE_URL` used to sit in
`.env.example` as unused template residue; it has been removed.)

`src/shared/config.ts` reads these at module load and derives
`ALLOWED_IMAGE_HOSTS` — the Supabase project host plus anything in
`NEXT_PUBLIC_EXTRA_IMAGE_HOSTS`. That list is the single source of truth for
where incident photos may come from, and it is consumed in three places: the
`photo_url` Zod schema, `images.remotePatterns`, and the CSP `img-src`
directive. Since these are `NEXT_PUBLIC_*` they must be present at build time.

`src/shared/api/fire.ts` throws a descriptive error if either Supabase var is
missing when the client is first constructed (lazily, via a module-level cached
client).

**`.env.local` is only needed for real data.** In any non-production build
`src/shared/config.ts` falls back to `https://supabase.test` — the origin the MSW
handlers intercept — so `pnpm dev` works on a fresh clone with no env at all.
Without that fallback the client constructor throws _before_ any request, which
MSW cannot intercept, and the page renders "Could not load incidents." The
fallback is dev-only: production with a missing var still fails loudly.
`next.config.js` mirrors it so dev `img-src`/`connect-src` allow the mock origin.
The Playwright `webServer` deliberately passes **no** env, so e2e exercises the
same path a developer gets.

## Security invariants

- **`photo_url` is validated for scheme and host**, not just URL shape:
  `z.string().url()` accepts `javascript:` and `data:`. `PhotoUrlSchema` requires
  https on an allowed host. A row failing this rejects the whole response.
- **Never interpolate `photo_url` into CSS.** It previously fed a `<body>`
  `background-image: url(...)`; that was removed. Attribute contexts
  (`<Image src>`, OG meta) are escaped by React/Next and are fine.
- **`select()` lists columns explicitly.** Don't reintroduce `select('*')`, or the
  next column added to the table ships to the browser.
- **Security headers live in `next.config.js`.** The CSP keeps `'unsafe-inline'`
  for script and style (inline styles everywhere, plus Next's bootstrap
  scripts), so its real value is `img-src`, `connect-src` and `frame-ancestors`.
- **`public/mockServiceWorker.js` is gitignored** and must stay that way: a
  root-scoped service worker in production is a durable XSS foothold.
- Everything else rests on **Supabase RLS**, which is not visible from this repo.
  The anon key is public by design, so `fire_incidents` must have RLS on, SELECT
  for `anon`, and writes restricted to a service-role ingest path.

## Architecture

```
app/
  layout.tsx        Server component, `revalidate = 60` (ISR). Fetches the last fire for
                    generateMetadata only — the OG/Twitter title flips between "🔥 YES"
                    and "✅ NO" — via a react `cache()`-wrapped fetchLastFire. All global
                    CSS and every @keyframes lives in the inline <style> in <head>.
  providers.tsx     Client. React Query provider + starts the MSW browser worker whenever
                    NODE_ENV !== 'production'.
  page.tsx          Client. The entire UI, ~1500 lines, single file.
src/shared/
  api/fire.ts       Supabase client + Zod schemas + all query functions.
  config.ts         env vars + ALLOWED_IMAGE_HOSTS.
tests/
  unit/             Vitest (jsdom) over the api layer.
  msw/              handlers.ts (fixtures) + server.ts (node) + browser.ts (worker).
  e2e/              Playwright; playwright.config.ts defines mobile/tablet/desktop projects.
```

### The MSW-in-dev gotcha (read this first)

`app/providers.tsx` starts the MSW service worker for **any** non-production build, so `pnpm dev` never talks to real Supabase — it is served entirely by the fixtures in `tests/msw/handlers.ts`. The Playwright `webServer` leans on this deliberately: it launches `pnpm dev` with `NEXT_PUBLIC_SUPABASE_URL=https://supabase.test`, which is exactly the origin the handlers intercept.

Consequences:

- To see real data locally you must build and run production (`pnpm build && pnpm start`) or temporarily disable the worker.
- Server-side calls (`layout.tsx`) are _not_ intercepted by the browser worker — only client-side queries in `page.tsx` are.
- Changing fixture data in `tests/msw/handlers.ts` changes what dev mode and E2E both see.
- The worker script itself is generated by `predev`, not committed. If dev
  requests sail straight past MSW, run `pnpm msw:init`.
- The fixture photo host (`supabase.test`) does not resolve, so `/_next/image`
  logs errors and the background photo is blank in dev. That is expected, not a
  regression — point `NEXT_PUBLIC_EXTRA_IMAGE_HOSTS` at a real placeholder host
  and update the fixtures if you need a visible photo locally.

### Data flow

- `getLastFire()` — server-side only, in `layout.tsx`, for metadata.
- `page.tsx` runs **two** React Query hooks: `['fireIncidents']` →
  `getFireIncidents()` (newest-first, bounded by `INCIDENT_LIST_LIMIT = 100`) and
  `['fireYearActivity']` → `getFireYearActivity()`, which backs both the stats
  pill and the monthly chart from a single `datetime`-only query. Both use a 60s
  `staleTime`. Don't split the year query back into two; that was three round
  trips fetching full rows in order to call `.length` on them.
- `getFireIncidents` takes a `limit` parameter, so pass it as `queryFn: () =>
getFireIncidents()` — handing React Query the function directly would pass its
  context object as `limit`.
- Every Supabase response goes through a Zod schema before it reaches the UI
  (`FireIncidentSchema`, `FireStatsSchema`, `FireMonthlyStatsSchema`). Never
  bypass this.
- `getFireYearActivity()` computes its window from `new Date()` and aggregates
  client-side (Supabase has no RPC/view for this), so it is **clock-dependent** —
  which matters for tests.
- **Where the timers live:** `<Countdown>` owns the once-per-second tick and is
  mounted only on the NO branch, so it exists only while visible. `HomePage`
  ticks every `DATE_TICK_MS` (60s) purely to notice a date rollover, which means
  the YES/NO flip at midnight can lag by up to a minute. Don't move the 1s
  interval back up into `HomePage`: it re-rendered the whole tree — 35 style
  objects, the chart, every sidebar row — every second, even on days with a fire
  when the countdown isn't rendered.

### Styling reality

There are **no CSS files, no CSS Modules, and no Tailwind** in this repo despite
what older docs suggest. All styling is:

- an inline `token` object at the top of `app/page.tsx` (palette, glass surfaces,
  shadows, font stacks) used to build `CSSProperties` objects,
- **module-scope** style objects for anything that doesn't depend on state — only
  the ~12 genuinely state-dependent ones are built inside `HomePage`,
- global resets, all `@keyframes`, and the `prefers-reduced-motion` override in
  the inline `<style>` in `app/layout.tsx`.

Follow that pattern rather than introducing a stylesheet, unless you intend to
migrate the whole file.

Two animation rules worth keeping:

- **Animate `opacity`/`transform` only.** The YES glow used to animate
  `text-shadow`, which is not compositor-accelerated and repainted a
  `clamp(6rem, 20vw, 13rem)` text layer every frame on top of eight
  `backdrop-filter` surfaces. It now uses a static shadow and `glow-pulse`.
- **Reduced motion is enforced globally** with `!important` in the layout, which
  is required to beat inline `animation` values. Don't go back to redefining
  keyframes as empty rules — the compositor keeps ticking those.

Remote photos render through `next/image` with `fill` + optimization enabled.
The allowed hosts come from `images.remotePatterns`, derived from
`ALLOWED_IMAGE_HOSTS`; a photo on an unlisted host will not be proxied.

### No path aliases

`tsconfig.json` defines no `paths`. Imports are relative (`../src/shared/api/fire`). `@/...` specifiers will not resolve.

## Conventions

- New API functions go in `src/shared/api/`, each paired with a Zod schema and a unit test covering the happy path plus at least one invalid-payload case.
- Any new data-driven screen needs at least one Playwright spec, which automatically runs across mobile/tablet/desktop.
- Mobile-first, breakpoints 640 / 768 / 1024 / 1280. `clamp()` for fluid type. Interactive targets ≥ 40×40px. Verify at ~375px, ~820px, ~1280px. Lists/cards go 1 column on mobile → 2–3 at lg+.
- Add `data-testid` to anything E2E needs to assert on (existing ones: `countdown`, `stats`).
- Husky + lint-staged run `eslint --fix` and `prettier --write` on staged files. Prettier: single quotes, semicolons, trailing commas.

## Testing traps

- **Env vars must be set before importing the api module.**
  `src/shared/config.ts` snapshots `process.env` at load time, so
  `tests/unit/fire.test.ts` assigns `NEXT_PUBLIC_SUPABASE_*` at the very top of
  the file and then `await import(...)`s `fire.ts` inside `beforeAll`. Keep that
  ordering in new unit tests — it is also what makes `ALLOWED_IMAGE_HOSTS`
  resolve to `supabase.test`, which fixture `photo_url`s must match.
- **MSW fixtures are built per request from the current clock**, so
  `vi.setSystemTime` moves them too. Unit tests pin the clock and assert exact
  counts; the E2E spec asserts the _shape_ of the stats pill. Keep that split —
  literal counts in the E2E spec previously rotted into a September-2024-only
  assertion. The offsets are also chosen so the newest incident is never today,
  because the countdown only renders on the NO branch.
- MSW handler intercepts `GET https://supabase.test/rest/v1/fire_incidents` and
  hand-implements the `datetime=gte.*` and `limit` params. New Supabase filters
  used in `fire.ts` need matching support there.
- The stats pill spaces its `/` separator with CSS margin, not whitespace, so its
  text content is `2 this month/3 this year` with no spaces around the slash.

## AGENTS.md

`AGENTS.md` is the original Russian-language scaffolding brief for this project. It describes axios, `src/entities/`, `src/features/`, `src/hooks/`, `@/` path aliases, CSS tokens files, and SCSS — **none of which exist**. Treat this file (CLAUDE.md) as authoritative; use AGENTS.md only for the responsive/testing intent it documents.
