'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getFireIncidents,
  getFireStats,
  getFireIncidentsByMonth,
  type FireIncident,
  type FireMonthlyStats,
} from '../src/shared/api/fire';
import Image from 'next/image';

// ---------------------------------------------------------------------------
// Design tokens (inline-styles only — no CSS files, no Tailwind)
// ---------------------------------------------------------------------------
const token = {
  // Base palette
  black: '#000000',
  gray950: '#0a0a0b',
  gray900: '#111113',
  gray800: '#1c1c1f',
  gray700: '#2a2a2f',
  gray400: '#8a8a96',
  gray200: '#d4d4de',
  white: '#ffffff',

  // Status colours
  red: '#ff3b30',
  redGlow: 'rgba(255,59,48,0.55)',
  orange: '#ff6b35',
  green: '#30d158',
  greenGlow: 'rgba(48,209,88,0.45)',
  greenMuted: 'rgba(48,209,88,0.12)',
  redMuted: 'rgba(255,59,48,0.12)',

  // Glass surfaces
  glassDark: 'rgba(10,10,12,0.72)',
  glassMid: 'rgba(18,18,22,0.60)',
  glassLight: 'rgba(255,255,255,0.04)',

  // Borders
  borderSubtle: 'rgba(255,255,255,0.07)',
  borderMid: 'rgba(255,255,255,0.12)',

  // Shadows
  shadowDeep: '0 24px 64px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.5)',
  shadowMd: '0 8px 32px rgba(0,0,0,0.55)',
  shadowSm: '0 2px 12px rgba(0,0,0,0.4)',

  // Typography
  fontSystem: "'Segoe UI', system-ui, -apple-system, sans-serif",
  fontMono: "'SF Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
} as const;

// ---------------------------------------------------------------------------
// Tiny reusable SVG icons (inline, no external dependency)
// ---------------------------------------------------------------------------
const MenuIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="2"
      y="4.5"
      width="16"
      height="1.75"
      rx="0.875"
      fill="currentColor"
    />
    <rect
      x="2"
      y="9.125"
      width="16"
      height="1.75"
      rx="0.875"
      fill="currentColor"
    />
    <rect
      x="2"
      y="13.75"
      width="16"
      height="1.75"
      rx="0.875"
      fill="currentColor"
    />
  </svg>
);

const CloseIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M2 2L16 16M16 2L2 16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="1"
      y="2.5"
      width="12"
      height="10.5"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.25"
    />
    <path
      d="M4.5 1V4M9.5 1V4"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
    />
    <path d="M1 5.5H13" stroke="currentColor" strokeWidth="1.25" />
  </svg>
);

const PinIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M7 1C4.79 1 3 2.79 3 5c0 3.25 4 8 4 8s4-4.75 4-8c0-2.21-1.79-4-4-4z"
      stroke="currentColor"
      strokeWidth="1.25"
      fill="none"
    />
    <circle cx="7" cy="5" r="1.25" fill="currentColor" />
  </svg>
);

const FlameIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M6 1C6 1 8.5 3.5 8.5 5.5C8.5 6.2 8.1 6.9 7.5 7.3C7.7 6.8 7.5 6.2 7 5.9C6.5 5.6 6 5 6 4C6 4 4.5 5.5 4.5 6.5C4.5 7.5 5.17 8.5 6 8.5C7.38 8.5 8.5 7.38 8.5 6C8.5 4 6 1 6 1Z"
      fill="currentColor"
    />
    <path
      d="M4.5 6.5C4.5 7.5 5.17 8.5 6 8.5C7.38 8.5 8.5 7.38 8.5 6C8.5 7.1 7.6 8 6.5 8C5.5 8 4.5 7.1 4.5 6.5Z"
      fill="currentColor"
      opacity="0.6"
    />
  </svg>
);

// ---------------------------------------------------------------------------
// Keyframe animation injection (runs once, uses a style tag)
// ---------------------------------------------------------------------------
const ANIMATIONS_ID = 'is-onfire-keyframes';

function injectAnimations() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(ANIMATIONS_ID)) return;
  const style = document.createElement('style');
  style.id = ANIMATIONS_ID;
  style.textContent = `
    @keyframes pulse-glow-red {
      0%, 100% {
        text-shadow:
          0 0 20px rgba(255,59,48,0.9),
          0 0 60px rgba(255,59,48,0.6),
          0 0 120px rgba(255,59,48,0.3);
        opacity: 1;
      }
      50% {
        text-shadow:
          0 0 40px rgba(255,107,53,1),
          0 0 100px rgba(255,59,48,0.8),
          0 0 180px rgba(255,59,48,0.4);
        opacity: 0.88;
      }
    }
    @keyframes slide-in-left {
      from { transform: translateX(-105%); }
      to   { transform: translateX(0); }
    }
    @keyframes fade-up {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes shimmer-digit {
      0%, 100% { background-color: rgba(48,209,88,0.08); }
      50%       { background-color: rgba(48,209,88,0.16); }
    }
    @keyframes status-bar-pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.7; }
    }
    @keyframes pulse-glow-multi {
      0%, 100% {
        text-shadow:
          0 0 30px rgba(255,59,48,1),
          0 0 90px rgba(255,59,48,0.85),
          0 0 180px rgba(255,59,48,0.55);
        opacity: 1;
      }
      20% {
        text-shadow:
          0 0 10px rgba(255,59,48,0.8),
          0 0 40px rgba(255,59,48,0.6),
          0 0 90px rgba(255,59,48,0.35);
        opacity: 0.8;
      }
      50% {
        text-shadow:
          0 0 60px rgba(255,107,53,1),
          0 0 140px rgba(255,59,48,0.95),
          0 0 260px rgba(255,59,48,0.6);
        opacity: 0.94;
      }
      75% {
        text-shadow:
          0 0 20px rgba(255,59,48,0.9),
          0 0 60px rgba(255,59,48,0.65),
          0 0 120px rgba(255,59,48,0.4);
        opacity: 0.85;
      }
    }
    @keyframes bar-grow {
      from { transform: scaleY(0); }
      to   { transform: scaleY(1); }
    }
    @keyframes chart-reveal {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @media (prefers-reduced-motion: reduce) {
      @keyframes pulse-glow-red  { from {} to {} }
      @keyframes fade-up          { from {} to {} }
      @keyframes shimmer-digit    { from {} to {} }
      @keyframes status-bar-pulse { from {} to {} }
      @keyframes pulse-glow-multi { from {} to {} }
      @keyframes bar-grow         { from {} to {} }
      @keyframes chart-reveal     { from {} to {} }
    }
  `;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Monospace countdown unit chip */
function CountdownChip({ value, label }: { value: number; label: string }) {
  const chipStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    minWidth: '64px',
  };

  const digitStyle: CSSProperties = {
    fontFamily: token.fontMono,
    fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
    fontWeight: 700,
    lineHeight: 1,
    color: token.green,
    background: token.greenMuted,
    border: `1px solid rgba(48,209,88,0.2)`,
    borderRadius: '10px',
    padding: '10px 14px',
    minWidth: '64px',
    textAlign: 'center',
    letterSpacing: '0.04em',
    animation: 'shimmer-digit 2s ease-in-out infinite',
    boxShadow: `0 0 20px rgba(48,209,88,0.12), inset 0 1px 0 rgba(255,255,255,0.05)`,
    transition: 'color 0.3s',
  };

  const labelStyle: CSSProperties = {
    fontFamily: token.fontSystem,
    fontSize: '0.65rem',
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: token.gray400,
  };

  return (
    <div style={chipStyle}>
      <div style={digitStyle}>{String(value).padStart(2, '0')}</div>
      <span style={labelStyle}>{label}</span>
    </div>
  );
}

/** Location pill — styled link with pin icon */
function LocationPill({
  street,
  isAlert = false,
}: {
  street: string;
  isAlert?: boolean;
}) {
  const pillStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: isAlert ? 'rgba(255,59,48,0.15)' : token.glassLight,
    border: `1px solid ${isAlert ? 'rgba(255,59,48,0.35)' : token.borderMid}`,
    borderRadius: '9999px',
    padding: '6px 14px 6px 10px',
    color: isAlert ? '#ff8a80' : token.gray200,
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontFamily: token.fontSystem,
    fontWeight: 500,
    transition: 'background-color 0.2s, border-color 0.2s',
    backdropFilter: 'blur(6px)',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
  };

  return (
    <a
      href={`https://www.google.com/maps/search/${encodeURIComponent(`${street}, Chisinau`)}`}
      target="_blank"
      rel="noopener noreferrer"
      style={pillStyle}
    >
      <PinIcon />
      {street}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Monthly bar chart (shown on stats pill hover)
// ---------------------------------------------------------------------------
const MONTH_ABBR = [
  'J',
  'F',
  'M',
  'A',
  'M',
  'J',
  'J',
  'A',
  'S',
  'O',
  'N',
  'D',
] as const;
const BAR_W = 14;
const BAR_GAP = 6;
const CHART_H = 72;
const CHART_W = 12 * BAR_W + 11 * BAR_GAP; // 234px

function MonthlyBarChart({
  data,
  currentMonth,
}: {
  data: FireMonthlyStats;
  currentMonth: number; // 1-based
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const wrapStyle: CSSProperties = {
    width: `${CHART_W + 28}px`,
    padding: '14px 14px 10px',
    backgroundColor: 'rgba(8,8,12,0.94)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: `1px solid ${token.borderMid}`,
    borderRadius: '14px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.75)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    animation: 'chart-reveal 0.22s ease-out both',
  };

  return (
    <div style={wrapStyle}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '0.65rem',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: token.gray400,
            fontFamily: token.fontSystem,
          }}
        >
          Monthly incidents
        </p>
        <span
          style={{
            fontSize: '0.65rem',
            fontWeight: 600,
            color: token.gray400,
            fontFamily: token.fontMono,
            letterSpacing: '0.06em',
          }}
        >
          {new Date().getFullYear()}
        </span>
      </div>

      <svg
        width={CHART_W}
        height={CHART_H + 18}
        style={{ overflow: 'visible' }}
      >
        {/* Baseline */}
        <line
          x1={0}
          y1={CHART_H}
          x2={CHART_W}
          y2={CHART_H}
          stroke={token.borderSubtle}
          strokeWidth={1}
        />

        {data.map((d, i) => {
          const barH =
            d.count === 0
              ? 0
              : Math.max(Math.round((d.count / maxCount) * CHART_H), 4);
          const x = i * (BAR_W + BAR_GAP);
          const y = CHART_H - barH;
          const isCurrent = d.month === currentMonth;
          const isFuture = d.month > currentMonth;

          const barFill = isCurrent
            ? token.red
            : isFuture
              ? token.gray800
              : token.gray400;

          return (
            <g key={d.month}>
              {/* Bar */}
              <rect
                x={x}
                y={barH === 0 ? CHART_H - 1 : y}
                width={BAR_W}
                height={barH === 0 ? 1 : barH}
                rx={barH > 6 ? 3 : 1}
                fill={barFill}
                opacity={isFuture ? 0.3 : 1}
                style={{
                  transformBox: 'fill-box' as CSSProperties['transformBox'],
                  transformOrigin: 'center bottom',
                  animation: `bar-grow 0.38s ease-out ${i * 0.025}s both`,
                }}
              />

              {/* Count label above bar */}
              {d.count > 0 && (
                <text
                  x={x + BAR_W / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fill={isCurrent ? token.white : token.gray400}
                  fontSize="9"
                  fontWeight={isCurrent ? 700 : 500}
                  fontFamily={token.fontMono}
                  style={{
                    animation: `fade-up 0.3s ease-out ${i * 0.025 + 0.15}s both`,
                  }}
                >
                  {d.count}
                </text>
              )}

              {/* Month label */}
              <text
                x={x + BAR_W / 2}
                y={CHART_H + 13}
                textAnchor="middle"
                fill={isCurrent ? token.white : token.gray400}
                fontSize="9"
                fontWeight={isCurrent ? 700 : 400}
                fontFamily={token.fontSystem}
              >
                {MONTH_ABBR[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function HomePage() {
  const { data: incidents } = useQuery({
    queryKey: ['fireIncidents'],
    queryFn: getFireIncidents,
  });
  const { data: stats } = useQuery({
    queryKey: ['fireStats'],
    queryFn: getFireStats,
  });
  const { data: monthlyData } = useQuery({
    queryKey: ['fireMonthlyStats'],
    queryFn: getFireIncidentsByMonth,
  });
  const [now, setNow] = useState(new Date());
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(
    null,
  );
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [statsHovered, setStatsHovered] = useState(false);

  // Inject keyframe animations once on mount
  useEffect(() => {
    injectAnimations();
  }, []);

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
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ------------------------------------------------------------------
  // Loading state
  // ------------------------------------------------------------------
  if (!incidents) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: token.gray950,
          color: token.gray400,
          fontFamily: token.fontSystem,
          gap: '16px',
        }}
      >
        {/* Animated skeleton pill */}
        <div
          style={{
            width: '200px',
            height: '8px',
            borderRadius: '9999px',
            background: `linear-gradient(90deg, ${token.gray800} 25%, ${token.gray700} 50%, ${token.gray800} 75%)`,
            backgroundSize: '400% 100%',
          }}
        />
        <span
          style={{
            fontSize: '0.8rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Loading incidents&hellip;
        </span>
      </main>
    );
  }

  // ------------------------------------------------------------------
  // Empty state
  // ------------------------------------------------------------------
  if (incidents.length === 0) {
    return (
      <main
        style={{
          padding: '2rem',
          textAlign: 'center',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: token.gray950,
          color: token.gray200,
          fontFamily: token.fontSystem,
          gap: '12px',
        }}
      >
        <FlameIcon />
        <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 500 }}>
          No fire incidents recorded.
        </p>
        <p style={{ margin: 0, fontSize: '0.85rem', color: token.gray400 }}>
          Check back later.
        </p>
      </main>
    );
  }

  // ------------------------------------------------------------------
  // Derived data
  // ------------------------------------------------------------------
  const latestIncident = incidents[0];
  const selectedIncident: FireIncident =
    incidents.find((i) => i.id === selectedIncidentId) ?? latestIncident;

  const lastDate = new Date(latestIncident.datetime);
  const isToday = lastDate.toDateString() === now.toDateString();
  const todayIncidents = isToday
    ? incidents.filter(
        (i) => new Date(i.datetime).toDateString() === now.toDateString(),
      )
    : [];
  const todayCount = todayIncidents.length;
  const isMultipleToday = todayCount > 1;
  const diffMs = now.getTime() - lastDate.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
  const seconds = Math.floor((diffMs / 1000) % 60);

  const formattedSelectedDate = new Date(
    selectedIncident.datetime,
  ).toLocaleString(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  // ------------------------------------------------------------------
  // Styles
  // ------------------------------------------------------------------

  // Root
  const rootStyle: CSSProperties = {
    position: 'relative',
    minHeight: '100vh',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: token.black,
    fontFamily: token.fontSystem,
    color: token.white,
  };

  // Full-screen photo background
  const bgWrapperStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    pointerEvents: 'none',
  };

  // Multi-layer overlay: bottom-dark vignette + top dark gradient + state tint
  const overlayGradientStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
    pointerEvents: 'none',
    background: isMultipleToday
      ? `
          linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(6,0,0,0.80) 40%, rgba(38,2,2,0.65) 70%, rgba(60,4,4,0.88) 100%),
          linear-gradient(to bottom, rgba(120,0,0,0.72) 0%, transparent 45%),
          linear-gradient(160deg, rgba(180,0,0,0.10) 0%, transparent 55%)
        `
      : isToday
        ? `
          linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.65) 40%, rgba(20,4,4,0.5) 70%, rgba(30,6,6,0.72) 100%),
          linear-gradient(to bottom, rgba(60,0,0,0.55) 0%, transparent 50%)
        `
        : `
          linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.62) 40%, rgba(4,10,14,0.45) 70%, rgba(6,12,18,0.68) 100%),
          linear-gradient(to bottom, rgba(0,20,40,0.45) 0%, transparent 50%)
        `,
  };

  // Sidebar toggle button
  const toggleBtnStyle: CSSProperties = {
    position: 'fixed',
    top: '16px',
    left: '16px',
    zIndex: 1100,
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    border: `1px solid ${token.borderMid}`,
    backgroundColor: token.glassDark,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    color: token.white,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: token.shadowSm,
    transition: 'background-color 0.2s, border-color 0.2s, box-shadow 0.2s',
  };

  // Dark overlay behind sidebar
  const backdropStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 900,
    backdropFilter: 'blur(2px)',
    WebkitBackdropFilter: 'blur(2px)',
  };

  // Sidebar — glassmorphism panel
  const sidebarStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: 'min(88vw, 360px)',
    backgroundColor: 'rgba(8,8,12,0.78)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRight: `1px solid ${token.borderSubtle}`,
    boxShadow: '8px 0 40px rgba(0,0,0,0.6)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-105%)',
    transition: 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
    pointerEvents: isSidebarOpen ? 'auto' : 'none',
    overflowY: 'auto',
  };

  // Sidebar header strip
  const sidebarHeaderStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: `1px solid ${token.borderSubtle}`,
    position: 'sticky',
    top: 0,
    backgroundColor: 'rgba(8,8,12,0.9)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    zIndex: 1,
  };

  const sidebarCloseBtnStyle: CSSProperties = {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: `1px solid ${token.borderSubtle}`,
    backgroundColor: token.glassLight,
    color: token.gray200,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s',
    flexShrink: 0,
  };

  // Main content section
  const mainSectionStyle: CSSProperties = {
    position: 'relative',
    zIndex: 2,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding:
      'clamp(80px, 12vh, 120px) clamp(20px, 5vw, 64px) clamp(80px, 10vh, 100px)',
    gap: 'clamp(32px, 5vh, 56px)',
    boxSizing: 'border-box',
  };

  // Status label — site name + status badge row
  const statusTopRowStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  };

  // Site title
  const siteTitleStyle: CSSProperties = {
    fontSize: 'clamp(0.65rem, 1.5vw, 0.8rem)',
    fontWeight: 700,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: token.gray400,
    margin: 0,
  };

  // Big YES/NO heading
  const yesHeadingStyle: CSSProperties = {
    fontFamily: token.fontSystem,
    fontSize: 'clamp(6rem, 20vw, 13rem)',
    fontWeight: 900,
    lineHeight: 0.9,
    margin: 0,
    letterSpacing: '-0.04em',
    color: token.red,
    animation: isMultipleToday
      ? 'pulse-glow-multi 0.9s ease-in-out infinite'
      : 'pulse-glow-red 2s ease-in-out infinite',
    textAlign: 'center',
  };

  const noHeadingStyle: CSSProperties = {
    fontFamily: token.fontSystem,
    fontSize: 'clamp(6rem, 20vw, 13rem)',
    fontWeight: 900,
    lineHeight: 0.9,
    margin: 0,
    letterSpacing: '-0.04em',
    color: token.green,
    textShadow: `0 0 40px ${token.greenGlow}, 0 0 100px rgba(48,209,88,0.2)`,
    textAlign: 'center',
  };

  // Question label above heading
  const questionStyle: CSSProperties = {
    fontSize: 'clamp(0.75rem, 1.8vw, 0.95rem)',
    fontWeight: 500,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: isToday ? 'rgba(255,140,130,0.9)' : 'rgba(100,200,150,0.85)',
    margin: 0,
  };

  // Countdown section wrapper
  const countdownWrapperStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    animation: 'fade-up 0.6s ease-out both',
  };

  const countdownLabelStyle: CSSProperties = {
    fontSize: '0.72rem',
    fontWeight: 600,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: token.gray400,
  };

  const countdownRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'clamp(8px, 2vw, 16px)',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  };

  const countdownSeparatorStyle: CSSProperties = {
    fontFamily: token.fontMono,
    fontSize: 'clamp(1.4rem, 3.5vw, 2rem)',
    fontWeight: 300,
    color: 'rgba(48,209,88,0.4)',
    alignSelf: 'flex-start',
    paddingTop: '10px',
    lineHeight: 1,
  };

  // Incident detail card
  const cardStyle: CSSProperties = {
    width: '100%',
    maxWidth: '600px',
    backgroundColor: 'rgba(10,10,14,0.70)',
    borderRadius: '16px',
    border: `1px solid ${token.borderSubtle}`,
    boxShadow: token.shadowDeep,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    overflow: 'hidden',
    animation: 'fade-up 0.7s ease-out 0.1s both',
  };

  // Card top accent bar
  const cardAccentBarStyle: CSSProperties = {
    height: '3px',
    background: isToday
      ? `linear-gradient(to right, ${token.red}, ${token.orange}, transparent)`
      : `linear-gradient(to right, ${token.green}, rgba(48,209,88,0.3), transparent)`,
  };

  const cardBodyStyle: CSSProperties = {
    padding: 'clamp(16px, 3vw, 28px) clamp(20px, 4vw, 32px)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  };

  const cardHeaderStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  };

  const cardTitleStyle: CSSProperties = {
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: token.gray400,
    margin: 0,
  };

  const cardDividerStyle: CSSProperties = {
    flex: 1,
    height: '1px',
    backgroundColor: token.borderSubtle,
  };

  const cardRowStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: '8px 16px',
    alignItems: 'start',
  };

  const cardLabelStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: token.gray400,
    paddingTop: '1px',
    whiteSpace: 'nowrap' as const,
  };

  const cardValueStyle: CSSProperties = {
    fontSize: '0.9rem',
    fontWeight: 500,
    color: token.gray200,
    lineHeight: 1.5,
    wordBreak: 'break-word' as const,
  };

  // Stats pill — bottom right (positioning handled by wrapper)
  const statsPillStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(8,8,12,0.82)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: `1px solid ${token.borderMid}`,
    borderRadius: '9999px',
    padding: '6px 14px 6px 10px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: token.gray200,
    boxShadow: token.shadowSm,
    letterSpacing: '0.02em',
  };

  const statsIconWrapStyle: CSSProperties = {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,59,48,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: token.red,
    flexShrink: 0,
  };

  // Sidebar incident list item
  const incidentItemBtnBase: CSSProperties = {
    width: '100%',
    textAlign: 'left',
    background: 'transparent',
    color: token.white,
    border: `1px solid ${token.borderSubtle}`,
    borderRadius: '10px',
    padding: '12px 14px',
    cursor: 'pointer',
    transition: 'background-color 0.18s, border-color 0.18s',
    fontSize: '0.875rem',
    lineHeight: 1.4,
    fontFamily: token.fontSystem,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  };

  // Status bar — top fixed strip
  const statusBarStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px 0 72px',
    backgroundColor: 'rgba(6,6,9,0.75)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: `1px solid ${token.borderSubtle}`,
    boxShadow: '0 1px 0 rgba(255,255,255,0.03)',
  };

  const statusBarAccentStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '3px',
    background: isToday
      ? `linear-gradient(to bottom, ${token.red}, ${token.orange})`
      : `linear-gradient(to bottom, ${token.green}, rgba(48,209,88,0.4))`,
  };

  const statusBarTitleStyle: CSSProperties = {
    fontSize: '0.78rem',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: token.gray400,
    fontFamily: token.fontSystem,
  };

  const statusBadgeStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px 4px 8px',
    borderRadius: '9999px',
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    backgroundColor: isMultipleToday
      ? 'rgba(255,59,48,0.30)'
      : isToday
        ? 'rgba(255,59,48,0.18)'
        : 'rgba(48,209,88,0.14)',
    border: `1px solid ${isMultipleToday ? 'rgba(255,59,48,0.65)' : isToday ? 'rgba(255,59,48,0.35)' : 'rgba(48,209,88,0.3)'}`,
    color: isToday ? '#ff8a80' : '#69f0ae',
    boxShadow: isMultipleToday ? '0 0 12px rgba(255,59,48,0.35)' : 'none',
    animation: isMultipleToday
      ? 'status-bar-pulse 0.8s ease-in-out infinite'
      : isToday
        ? 'status-bar-pulse 2s ease-in-out infinite'
        : 'none',
  };

  const statusDotStyle: CSSProperties = {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: isToday ? token.red : token.green,
    boxShadow: isToday ? `0 0 6px ${token.red}` : `0 0 6px ${token.green}`,
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <main style={rootStyle}>
      {/* ── Full-screen background photo ── */}
      <div style={bgWrapperStyle} aria-hidden>
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

      {/* ── Cinematic overlay gradients ── */}
      <div style={overlayGradientStyle} aria-hidden />

      {/* ── Top status bar ── */}
      <header style={statusBarStyle} role="banner">
        <div style={statusBarAccentStyle} aria-hidden />
        <span style={statusBarTitleStyle}>is.chisinau.onfire</span>
        <div style={statusBadgeStyle}>
          <span style={statusDotStyle} aria-hidden />
          {isMultipleToday
            ? `${todayCount} fires today`
            : isToday
              ? 'Fire today'
              : 'No fire today'}
        </div>
      </header>

      {/* ── Sidebar toggle ── */}
      <button
        type="button"
        onClick={() => setSidebarOpen((o) => !o)}
        aria-label={isSidebarOpen ? 'Hide incident list' : 'Show incident list'}
        aria-expanded={isSidebarOpen}
        aria-controls="incident-sidebar"
        style={toggleBtnStyle}
      >
        <MenuIcon />
      </button>

      {/* ── Backdrop overlay ── */}
      {isSidebarOpen && (
        <div
          role="presentation"
          onClick={() => setSidebarOpen(false)}
          style={backdropStyle}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        id="incident-sidebar"
        aria-hidden={!isSidebarOpen}
        style={sidebarStyle}
      >
        {/* Sidebar header */}
        <div style={sidebarHeaderStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <h2
              style={{
                margin: 0,
                fontSize: '1rem',
                fontWeight: 700,
                color: token.white,
                letterSpacing: '0.01em',
              }}
            >
              Incident History
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: '0.72rem',
                color: token.gray400,
                letterSpacing: '0.04em',
              }}
            >
              {incidents.length} recorded incident
              {incidents.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Hide incident list"
            style={sidebarCloseBtnStyle}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Incident list */}
        <nav
          style={{
            padding: '12px 14px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            flex: 1,
          }}
        >
          <p
            style={{
              margin: '0 0 8px',
              fontSize: '0.68rem',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: token.gray400,
              paddingLeft: '2px',
            }}
          >
            Select to view
          </p>
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
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
                      ...incidentItemBtnBase,
                      backgroundColor: isActive
                        ? 'rgba(255,59,48,0.14)'
                        : 'rgba(255,255,255,0.025)',
                      borderColor: isActive
                        ? 'rgba(255,59,48,0.45)'
                        : token.borderSubtle,
                    }}
                    aria-pressed={isActive}
                  >
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: isActive ? '#ff8a80' : token.gray200,
                        letterSpacing: '0.02em',
                      }}
                    >
                      {isActive && (
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: token.red,
                            boxShadow: `0 0 6px ${token.red}`,
                            flexShrink: 0,
                          }}
                          aria-hidden
                        />
                      )}
                      {new Date(incident.datetime).toLocaleDateString(
                        undefined,
                        {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        },
                      )}
                    </span>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.8rem',
                        color: token.gray400,
                        paddingLeft: isActive ? '12px' : '0',
                      }}
                    >
                      <PinIcon />
                      {incident.street}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* ── Main content ── */}
      <section style={mainSectionStyle}>
        {/* Status block */}
        <div
          style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div style={statusTopRowStyle}>
            <p style={siteTitleStyle}>Chișinău, Moldova</p>
            <p style={questionStyle}>
              {isMultipleToday
                ? `${todayCount} simultaneous fires in Chișinău`
                : isToday
                  ? 'There is a fire today at'
                  : 'Days since the last fire in Chișinău'}
            </p>
          </div>

          {isToday ? (
            <>
              <h1 style={yesHeadingStyle}>YES</h1>

              {isMultipleToday && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 18px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(255,59,48,0.18)',
                    border: '1px solid rgba(255,59,48,0.5)',
                    color: '#ff8a80',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    boxShadow: '0 0 24px rgba(255,59,48,0.28)',
                    animation: 'status-bar-pulse 1.1s ease-in-out infinite',
                    fontFamily: token.fontSystem,
                  }}
                >
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: token.red,
                      boxShadow: `0 0 8px ${token.red}`,
                      flexShrink: 0,
                    }}
                    aria-hidden
                  />
                  {todayCount} active fires right now
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  justifyContent: 'center',
                  maxWidth: '520px',
                }}
              >
                {(isMultipleToday ? todayIncidents : [latestIncident]).map(
                  (i) => (
                    <LocationPill key={i.id} street={i.street} isAlert />
                  ),
                )}
              </div>
            </>
          ) : (
            <>
              <h1 style={noHeadingStyle}>NO</h1>
              {/* Countdown display */}
              <div style={countdownWrapperStyle}>
                <p style={countdownLabelStyle}>Time since last incident</p>
                <div style={countdownRowStyle} data-testid="countdown">
                  <CountdownChip value={days} label="Days" />
                  <span style={countdownSeparatorStyle}>:</span>
                  <CountdownChip value={hours} label="Hours" />
                  <span style={countdownSeparatorStyle}>:</span>
                  <CountdownChip value={minutes} label="Min" />
                  <span style={countdownSeparatorStyle}>:</span>
                  <CountdownChip value={seconds} label="Sec" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Incident detail card */}
        <article style={cardStyle}>
          <div style={cardAccentBarStyle} aria-hidden />
          <div style={cardBodyStyle}>
            {/* Card header */}
            <div style={cardHeaderStyle}>
              <p style={cardTitleStyle}>Incident details</p>
              <div style={cardDividerStyle} aria-hidden />
            </div>

            {/* When row */}
            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>
                <CalendarIcon />
                When
              </span>
              <span style={cardValueStyle}>{formattedSelectedDate}</span>
            </div>

            {/* Where row */}
            <div style={cardRowStyle}>
              <span style={cardLabelStyle}>
                <PinIcon />
                Where
              </span>
              <span style={cardValueStyle}>
                <LocationPill
                  street={selectedIncident.street}
                  isAlert={false}
                />
              </span>
            </div>
          </div>
        </article>
      </section>

      {/* ── Stats pill (bottom-right) ── */}
      {stats && (
        <div
          style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            zIndex: 10,
            cursor: 'default',
          }}
          onMouseEnter={() => setStatsHovered(true)}
          onMouseLeave={() => setStatsHovered(false)}
        >
          {/* Monthly chart popover */}
          {statsHovered && monthlyData && (
            <div
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 10px)',
                right: 0,
              }}
            >
              <MonthlyBarChart
                data={monthlyData}
                currentMonth={now.getMonth() + 1}
              />
            </div>
          )}

          <div style={statsPillStyle} data-testid="stats">
            <span style={statsIconWrapStyle}>
              <FlameIcon />
            </span>
            <span>
              <span style={{ color: token.white }}>{stats.month}</span>
              <span style={{ color: token.gray400 }}> this month</span>
              <span style={{ color: token.borderMid, margin: '0 6px' }}>/</span>
              <span style={{ color: token.white }}>{stats.year}</span>
              <span style={{ color: token.gray400 }}> this year</span>
            </span>
          </div>
        </div>
      )}
    </main>
  );
}
