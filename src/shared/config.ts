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
 * Hosts whose photos we run through the `next/image` optimizer. This is an
 * *optimization* allowlist, not a security boundary — `images.remotePatterns`
 * refuses to proxy anything not listed here, so an unlisted host has to render
 * `unoptimized` instead (see `isOptimizablePhotoHost`).
 *
 * It is deliberately NOT what validates `photo_url`. Incident photos are
 * hotlinked from whichever outlet reported the fire (ziua.md, stiri.md, ...), so
 * gating the Zod schema on this list rejected every real row — and because one
 * bad row fails the whole array parse, the entire feed died behind "Could not
 * load incidents." Scheme validation is the security property; see
 * `PhotoUrlSchema` in `api/fire.ts`.
 *
 * Add a frequently-seen outlet to `NEXT_PUBLIC_EXTRA_IMAGE_HOSTS` to get
 * resizing/AVIF for its photos; leaving it out costs bandwidth, not correctness.
 */
export const ALLOWED_IMAGE_HOSTS: readonly string[] = [
  ...hostOf(SUPABASE_URL),
  ...splitHosts(process.env.NEXT_PUBLIC_EXTRA_IMAGE_HOSTS),
];

/**
 * Whether `next/image` may proxy this photo. False means render it as-is with
 * `unoptimized`, which bypasses `remotePatterns` entirely — the difference
 * between a heavier image and no image at all.
 */
export function isOptimizablePhotoHost(rawUrl: string): boolean {
  try {
    return ALLOWED_IMAGE_HOSTS.includes(new URL(rawUrl).host);
  } catch {
    return false;
  }
}
