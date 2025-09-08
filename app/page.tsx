'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLastFire, getFireStats } from '../src/shared/api/fire';

export default function HomePage() {
  const { data } = useQuery({ queryKey: ['lastFire'], queryFn: getLastFire });
  const { data: stats } = useQuery({
    queryKey: ['fireStats'],
    queryFn: getFireStats,
  });
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return (
      <main style={{ padding: '2rem', textAlign: 'center' }}>Loading...</main>
    );
  }

  const lastDate = new Date(data.datetime);
  const isToday = lastDate.toDateString() === now.toDateString();
  const diffMs = now.getTime() - lastDate.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
  const seconds = Math.floor((diffMs / 1000) % 60);

  const labelStyle = {
    display: 'inline-block',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: '#fff',
    padding: '0.25rem 0.5rem',
    borderRadius: '0.25rem',
    textShadow: '0 0 4px rgba(0, 0, 0, 0.8)',
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
              style={{ color: 'inherit', textDecoration: 'underline' }}
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
          <p
            style={{ ...labelStyle, marginTop: '1rem', fontSize: '1.5rem' }}
            data-testid="countdown"
          >
            {`${days}d ${hours}h ${minutes}m ${seconds}s since last fire.`}
          </p>
        </>
      )}
      {stats && (
        <div
          style={{
            position: 'fixed',
            bottom: '1rem',
            right: '1rem',
            ...labelStyle,
          }}
          data-testid="stats"
        >
          {`${stats.month} this month / ${stats.year} this year`}
        </div>
      )}
    </main>
  );
}
