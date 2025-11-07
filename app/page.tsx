'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getFireIncidents,
  getFireStats,
  type FireIncident,
} from '../src/shared/api/fire';
import Image from 'next/image';

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
  const [isSidebarOpen, setSidebarOpen] = useState(false);

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
    margin: '0 auto',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: '#fff',
    padding: '0.25rem 0.5rem',
    borderRadius: '0.25rem',
    textShadow: '0 0 4px rgba(0, 0, 0, 0.8)',
  } as const;

  const containerStyle = {
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    minHeight: '100vh',
    width: '100%',
    color: '#fff',
    overflow: 'hidden',
    backgroundColor: '#111',
  } as const;

  const backgroundWrapperStyle = {
    position: 'absolute' as const,
    inset: 0,
    zIndex: 0,
    pointerEvents: 'none' as const,
  } as const;

  const sidebarBaseStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    maxWidth: '360px',
    width: 'min(90vw, 360px)',
    padding: '1.5rem 1rem 2rem',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(10px)',
    overflowY: 'auto',
    zIndex: 1000,
    boxShadow: '4px 0 18px rgba(0, 0, 0, 0.45)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  };

  const sidebarStyle: CSSProperties = {
    ...sidebarBaseStyle,
    transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-105%)',
    transition: 'transform 0.3s ease-in-out',
    pointerEvents: isSidebarOpen ? 'auto' : 'none',
  };

  const contentStyle = {
    flex: '1 1 100%',
    minWidth: '280px',
    padding: '4.5rem 1.5rem 2rem',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '2rem',
    position: 'relative' as const,
    zIndex: 2,
  } as const;

  const toggleButtonStyle = {
    position: 'fixed' as const,
    top: '1rem',
    left: '1rem',
    zIndex: 1100,
    width: '3rem',
    height: '3rem',
    borderRadius: '50%',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: '#fff',
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
    fontSize: '1.5rem',
    transition: 'background-color 0.2s ease-in-out',
  } as const;

  const overlayStyle = {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    zIndex: 900,
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
    position: 'relative' as const,
    zIndex: 2,
  } as const;

  const formattedSelectedDate = new Date(
    selectedIncident.datetime,
  ).toLocaleString(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return (
    <main style={containerStyle}>
      <div style={backgroundWrapperStyle} aria-hidden>
        <Image
          src={selectedIncident.photo_url}
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectFit: 'cover' }}
          unoptimized
        />
      </div>
      <button
        type="button"
        onClick={() => setSidebarOpen((open) => !open)}
        aria-label={isSidebarOpen ? 'Hide incident list' : 'Show incident list'}
        aria-expanded={isSidebarOpen}
        aria-controls="incident-sidebar"
        style={toggleButtonStyle}
      >
        ☰
      </button>
      {isSidebarOpen && (
        <div
          role="presentation"
          onClick={() => setSidebarOpen(false)}
          style={overlayStyle}
        />
      )}
      <aside
        id="incident-sidebar"
        style={sidebarStyle}
        aria-hidden={!isSidebarOpen}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
            Fire incidents
          </h2>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Hide incident list"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '1.5rem',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <h2
          style={{ marginBottom: '0.25rem', fontSize: '0.9rem', opacity: 0.7 }}
        >
          Select an incident
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
                  onClick={() => {
                    setSelectedIncidentId(incident.id);
                    setSidebarOpen(false);
                  }}
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
            zIndex: 2,
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
