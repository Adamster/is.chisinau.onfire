import Providers from './providers';
import { getLastFire } from '../src/shared/api/fire';

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const incident = await getLastFire().catch(() => null);

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
