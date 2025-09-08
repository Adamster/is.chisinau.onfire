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
      <body
        style={{
          backgroundImage: incident ? `url(${incident.photo_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          margin: 0,
          minHeight: '100vh',
        }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
