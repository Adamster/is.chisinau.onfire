import { cache } from 'react';
import type { Metadata } from 'next';
import Providers from './providers';
import { getLastFire } from '../src/shared/api/fire';

export const dynamic = 'force-dynamic';

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const incident = await fetchLastFire();

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
        `}</style>
      </head>
      <body
        style={{
          backgroundImage: incident ? `url(${incident.photo_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
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
