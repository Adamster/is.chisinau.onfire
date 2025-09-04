'use client';
import { useQuery } from '@tanstack/react-query';
import { getLastFire } from '../src/shared/api/fire';

export default function HomePage() {
  const { data } = useQuery({ queryKey: ['lastFire'], queryFn: getLastFire });
  const today = new Date();

  if (!data) {
    return (
      <main style={{ padding: '2rem', textAlign: 'center' }}>Loading...</main>
    );
  }

  const lastDate = new Date(data.datetime);
  const isToday = lastDate.toDateString() === today.toDateString();
  const daysSince = Math.floor(
    (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  const labelStyle = {
    opacity: 0.9,
    textShadow: '0 0 4px rgba(0, 0, 0, 0.5)',
  } as const;

  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        textAlign: 'center',
        padding: '1rem',
      }}
    >
      {isToday ? (
        <>
          <h1 style={{ ...labelStyle, fontSize: '4rem', color: 'red' }}>YES</h1>
          <p style={{ ...labelStyle, marginTop: '1rem', fontSize: '1.5rem' }}>
            <a
              href={`https://www.google.com/maps/search/${encodeURIComponent(`${data.street}, Chisinau`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {data.street}
            </a>
          </p>
        </>
      ) : (
        <>
          <h1 style={{ ...labelStyle, fontSize: '4rem', color: 'green' }}>
            NO
          </h1>
          <p style={{ ...labelStyle, marginTop: '1rem', fontSize: '1.5rem' }}>
            {daysSince} days since last fire.
          </p>
        </>
      )}
    </main>
  );
}
