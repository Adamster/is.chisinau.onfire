import { cache } from 'react';
import type { Metadata } from 'next';
import Providers from './providers';
import { getLastFire } from '../src/shared/api/fire';

// Incident data changes a few times a day, but `force-dynamic` made every
// request block on a Supabase round trip before the first byte. ISR keeps the
// shell and the OpenGraph card fresh within a minute at a fraction of the reads;
// the client queries in page.tsx still fetch live data on load.
export const revalidate = 60;

// Deduplicate the DB call across generateMetadata + RootLayout
const fetchLastFire = cache(() => getLastFire().catch(() => null));

export async function generateMetadata(): Promise<Metadata> {
  const incident = await fetchLastFire();
  const now = new Date();
  const isToday = incident
    ? new Date(incident.datetime).toDateString() === now.toDateString()
    : false;

  const title = isToday
    ? '🔥 YES — Fire in Chișinău right now'
    : '✅ NO — No fire in Chișinău today';

  const description = isToday
    ? `Active fire incident at ${incident!.street}, Chișinău, Moldova.`
    : incident
      ? `No fire today in Chișinău. Last incident was at ${incident.street}.`
      : 'Real-time fire incident tracker for Chișinău, Moldova.';

  const images = incident?.photo_url
    ? [{ url: incident.photo_url, width: 1200, height: 630, alt: title }]
    : [];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'is.chisinau.onfire',
      locale: 'en_US',
      type: 'website',
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: images.map((i) => i.url),
    },
  };
}

// The photo is rendered by the <Image> inside app/page.tsx. It is deliberately
// NOT also set as a <body> background-image: every render branch of the page
// paints an opaque, full-viewport <main> over the body, so a body background was
// downloaded at full resolution and never seen — and interpolating photo_url
// into a CSS url() was an injection sink for a tampered row.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="color-scheme" content="dark" />
        <style>{`
          *, *::before, *::after {
            box-sizing: border-box;
          }
          html {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
          }
          body {
            margin: 0;
            padding: 0;
            min-height: 100vh;
            background-color: #000;
            overflow-x: hidden;
          }
          button {
            -webkit-tap-highlight-color: transparent;
          }
          a {
            -webkit-tap-highlight-color: transparent;
          }
          :focus-visible {
            outline: 2px solid rgba(255, 255, 255, 0.6);
            outline-offset: 2px;
            border-radius: 4px;
          }
          ::-webkit-scrollbar {
            width: 4px;
          }
          ::-webkit-scrollbar-track {
            background: transparent;
          }
          ::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.12);
            border-radius: 9999px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.22);
          }

          /*
           * Keyframes used by app/page.tsx. These were previously injected into
           * a <style> tag from a useEffect on mount, which cost a style
           * recalculation after hydration; they are static, so they belong here.
           *
           * Every animation below drives opacity or transform only — both are
           * compositor-accelerated. The YES glow used to animate text-shadow,
           * which forces a full repaint of a very large text layer every frame.
           */
          @keyframes glow-pulse {
            0%, 100% { opacity: 1; }
            50%      { opacity: 0.86; }
          }
          @keyframes glow-pulse-fast {
            0%, 100% { opacity: 1; }
            25%      { opacity: 0.82; }
            50%      { opacity: 0.95; }
            75%      { opacity: 0.85; }
          }
          @keyframes fade-up {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes shimmer-digit {
            0%, 100% { opacity: 0.92; }
            50%      { opacity: 1; }
          }
          @keyframes status-bar-pulse {
            0%, 100% { opacity: 1; }
            50%      { opacity: 0.7; }
          }
          @keyframes bar-grow {
            from { transform: scaleY(0); }
            to   { transform: scaleY(1); }
          }
          @keyframes chart-reveal {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }

          /*
           * Real reduced-motion support. The previous approach redefined the
           * keyframes as empty rules, which left the compositor still ticking
           * every animation. !important is required to beat inline styles.
           */
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
              scroll-behavior: auto !important;
            }
          }
        `}</style>
      </head>
      <body
        style={{
          backgroundColor: '#000',
          margin: 0,
          minHeight: '100vh',
        }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
