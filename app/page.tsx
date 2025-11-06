'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getFireIncidents,
  getFireStats,
  type FireIncident,
} from '../src/shared/api/fire';

export default function HomePage() {
  const { data: incidents } = useQuery({
    queryKey: ['fireIncidents'],
    queryFn: getFireIncidents,
  });
  const { data: stats } = useQuery({
    queryKey: ['fireStats'],
    queryFn: getFireStats,
  });
  const [now, setNow] = useState(new Date());
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(
    null,
  );

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (incidents?.length && selectedIncidentId === null) {
      setSelectedIncidentId(incidents[0].id);
    }
  }, [incidents, selectedIncidentId]);

  useEffect(() => {
    if (
      incidents?.length &&
      selectedIncidentId !== null &&
      !incidents.some((incident) => incident.id === selectedIncidentId)
    ) {
      setSelectedIncidentId(incidents[0].id);
    }
  }, [incidents, selectedIncidentId]);

  if (!incidents) {
    return (
      <main style={{ padding: '2rem', textAlign: 'center' }}>Loading...</main>
    );
  }

  if (incidents.length === 0) {
    return (
      <main
        style={{
          padding: '2rem',
          textAlign: 'center',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        No fire incidents recorded.
      </main>
    );
  }

  const latestIncident = incidents[0];
  const selectedIncident: FireIncident =
    incidents.find((incident) => incident.id === selectedIncidentId) ??
    latestIncident;

  const lastDate = new Date(latestIncident.datetime);
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

  const containerStyle = {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    minHeight: '100vh',
    width: '100%',
    background:
      'radial-gradient(circle at top, rgba(255, 69, 58, 0.2), transparent), #111',
    color: '#fff',
  } as const;

  const sidebarStyle = {
    flex: '1 1 260px',
    maxWidth: '420px',
    minWidth: '240px',
    padding: '1.5rem 1rem',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(6px)',
  } as const;

  const contentStyle = {
    flex: '2 1 420px',
    minWidth: '280px',
    padding: '2rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2rem',
  } as const;

  const listButtonBase = {
    width: '100%',
    textAlign: 'left',
    background: 'transparent',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '0.75rem',
    padding: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    fontSize: '0.95rem',
    lineHeight: 1.4,
  } as const;

  const detailCardStyle = {
    width: '100%',
    maxWidth: '720px',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: '1rem',
    overflow: 'hidden',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.35)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  } as const;

  const formattedSelectedDate = new Date(
    selectedIncident.datetime,
  ).toLocaleString(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return (
    <main style={containerStyle}>
      <aside style={sidebarStyle}>
        <h2
          style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 600 }}
        >
          Fire incidents
        </h2>
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gap: '0.75rem',
          }}
        >
          {incidents.map((incident) => {
            const isActive = incident.id === selectedIncident.id;
            return (
              <li key={incident.id}>
                <button
                  type="button"
                  onClick={() => setSelectedIncidentId(incident.id)}
                  style={{
                    ...listButtonBase,
                    backgroundColor: isActive
                      ? 'rgba(255, 69, 58, 0.35)'
                      : 'rgba(255, 255, 255, 0.03)',
                    borderColor: isActive
                      ? 'rgba(255, 69, 58, 0.6)'
                      : 'rgba(255, 255, 255, 0.1)',
                  }}
                  aria-pressed={isActive}
                >
                  <span style={{ display: 'block', fontWeight: 600 }}>
                    {new Date(incident.datetime).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span style={{ opacity: 0.85 }}>{incident.street}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
      <section style={contentStyle}>
        <div style={{ textAlign: 'center' }}>
          {isToday ? (
            <>
              <h1 style={{ ...labelStyle, fontSize: '4rem', color: 'red' }}>
                YES
              </h1>
              <p
                style={{ ...labelStyle, marginTop: '1rem', fontSize: '1.2rem' }}
              >
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(`${latestIncident.street}, Chisinau`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'inherit', textDecoration: 'underline' }}
                >
                  {latestIncident.street}
                </a>
              </p>
            </>
          ) : (
            <>
              <h1 style={{ ...labelStyle, fontSize: '4rem', color: 'green' }}>
                NO
              </h1>
              <p
                style={{ ...labelStyle, marginTop: '1rem', fontSize: '1.2rem' }}
                data-testid="countdown"
              >
                {`${days}d ${hours}h ${minutes}m ${seconds}s since last fire.`}
              </p>
            </>
          )}
        </div>
        <article style={detailCardStyle}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              paddingTop: '56.25%',
              overflow: 'hidden',
            }}
          >
            <img
              src={selectedIncident.photo_url}
              alt={`Fire incident at ${selectedIncident.street}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
          <div
            style={{
              padding: '1.25rem 1.5rem',
              display: 'grid',
              gap: '0.75rem',
            }}
          >
            <h3 style={{ fontSize: '1.5rem', margin: 0 }}>Incident details</h3>
            <p style={{ margin: 0, opacity: 0.85 }}>
              <strong>When:</strong> {formattedSelectedDate}
            </p>
            <p style={{ margin: 0, opacity: 0.85 }}>
              <strong>Where:</strong>{' '}
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(`${selectedIncident.street}, Chisinau`)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'inherit', textDecoration: 'underline' }}
              >
                {selectedIncident.street}
              </a>
            </p>
          </div>
        </article>
      </section>
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
