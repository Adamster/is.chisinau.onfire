/**
 * @param {string | undefined} rawUrl
 * @returns {URL | null}
 */
function parseUrl(rawUrl) {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
}

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Mirrors the dev fallback in src/shared/config.ts: with no `.env.local` the app
 * talks to the MSW mock origin, so img-src/connect-src have to allow it or dev
 * blocks the very requests the fixtures answer.
 */
const supabase = parseUrl(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (isDev ? 'https://supabase.test' : undefined),
);

/**
 * Hosts allowed to serve incident photos. Kept in sync with
 * `ALLOWED_IMAGE_HOSTS` in src/shared/config.ts, which validates `photo_url`
 * before it ever reaches an <Image src> or the OpenGraph card.
 */
const imageHosts = [
  ...(supabase ? [supabase.host] : []),
  ...(process.env.NEXT_PUBLIC_EXTRA_IMAGE_HOSTS ?? '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean),
];

const supabaseOrigins = supabase
  ? [supabase.origin, `wss://${supabase.host}`]
  : [];

/**
 * Note on `'unsafe-inline'`: the whole UI is built from inline style objects and
 * an inline <style> block in app/layout.tsx, and Next injects inline bootstrap
 * scripts. A nonce-based policy would require middleware, so script/style stay
 * permissive here — the value this CSP does add is img-src, connect-src and
 * frame-ancestors, which is also what blunts a tampered photo_url.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${imageHosts.map((h) => ` https://${h}`).join('')}`,
  "font-src 'self' data:",
  `connect-src 'self'${supabaseOrigins.map((o) => ` ${o}`).join('')}${
    isDev ? ' ws: http://localhost:*' : ''
  }`,
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    /**
     * Enables AVIF/WebP + responsive resizing for the full-screen incident photo,
     * which was previously served `unoptimized` at full resolution to every
     * device. Doubles as an allowlist: without a matching pattern Next refuses to
     * proxy a URL through /_next/image.
     */
    remotePatterns: imageHosts.map((hostname) => ({
      protocol: 'https',
      hostname,
    })),
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

module.exports = nextConfig;
