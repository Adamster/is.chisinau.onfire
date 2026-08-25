/**
 * Dev fallback. `app/providers.tsx` starts the MSW worker for every
 * non-production build, and `tests/msw/handlers.ts` intercepts this origin, so
 * `pnpm dev` is served entirely by fixtures. Without a fallback the Supabase
 * client throws on the missing env var *before* a request is ever made, which
 * MSW cannot intercept — a fresh checkout with no `.env.local` renders "Could
 * not load incidents." instead of the mock feed. Production still fails loudly
 * (see `getSupabaseClient`); this only papers over the dev path that is already
 * mocked. It is also exactly what the Playwright `webServer` passes in.
 */
const MOCK_SUPABASE_URL = 'https://supabase.test';
const MOCK_SUPABASE_ANON_KEY = 'msw-anon-key';

const isProduction = process.env.NODE_ENV === 'production';

export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ||
  (isProduction ? '' : MOCK_SUPABASE_URL)) as string;

export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (isProduction ? '' : MOCK_SUPABASE_ANON_KEY)) as string;

function hostOf(rawUrl: string | undefined): string[] {
  if (!rawUrl) return [];
  try {
    return [new URL(rawUrl).host];
  } catch {
    return [];
  }
}

function splitHosts(rawList: string | undefined): string[] {
  return (rawList ?? '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);
}

/**
 * Hosts permitted to serve incident photos. Defaults to the Supabase project
 * host (storage lives on the same host) and can be extended for photos hosted
 * elsewhere. Consumed by the `photo_url` schema in `api/fire.ts` and mirrored by
 * `images.remotePatterns` / the CSP `img-src` directive in `next.config.js`.
 *
 * Empty means "unconfigured" — the schema then falls back to enforcing https
 * only, so a missing env var degrades the allowlist instead of breaking the app.
 */
export const ALLOWED_IMAGE_HOSTS: readonly string[] = [
  ...hostOf(SUPABASE_URL),
  ...splitHosts(process.env.NEXT_PUBLIC_EXTRA_IMAGE_HOSTS),
];
