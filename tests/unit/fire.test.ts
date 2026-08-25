process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';

import {
  beforeAll,
  afterEach,
  afterAll,
  describe,
  it,
  expect,
  vi,
} from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../msw/server';

type FireApi = typeof import('../../src/shared/api/fire');

let getLastFire: FireApi['getLastFire'];
let getFireIncidents: FireApi['getFireIncidents'];
let getFireYearActivity: FireApi['getFireYearActivity'];
let PhotoUrlSchema: FireApi['PhotoUrlSchema'];
let SourceUrlSchema: FireApi['SourceUrlSchema'];

beforeAll(async () => {
  server.listen();
  ({
    getLastFire,
    getFireIncidents,
    getFireYearActivity,
    PhotoUrlSchema,
    SourceUrlSchema,
  } = await import('../../src/shared/api/fire'));
});

afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
});
afterAll(() => server.close());

describe('getLastFire', () => {
  it('fetches last fire incident', async () => {
    const incident = await getLastFire();
    expect(incident?.street).toBe('Stefan cel Mare');
  });
});

describe('getFireIncidents', () => {
  it('returns incidents ordered from newest to oldest', async () => {
    const incidents = await getFireIncidents();
    expect(incidents).toHaveLength(4);
    expect(incidents[0].id).toBe(1);
    expect(new Date(incidents[0].datetime).getTime()).toBeGreaterThan(
      new Date(incidents[1].datetime).getTime(),
    );
  });

  it('bounds the result set with a limit', async () => {
    const incidents = await getFireIncidents(2);
    expect(incidents).toHaveLength(2);
  });
});

describe('getFireYearActivity', () => {
  it('derives month count, year count and the monthly chart from one query', async () => {
    // Fixtures are 3, 20, 200 and 500 days old relative to this instant, so:
    // 2026-08-22 and 2026-08-05 are this month, 2026-02-06 is this year,
    // and 2025-04-13 falls outside the year window.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-25T12:00:00Z'));

    const { stats, monthly } = await getFireYearActivity();

    expect(stats).toEqual({ month: 2, year: 3 });
    expect(monthly).toHaveLength(12);
    expect(monthly.find((m) => m.month === 8)?.count).toBe(2);
    expect(monthly.find((m) => m.month === 2)?.count).toBe(1);
    expect(monthly.find((m) => m.month === 12)?.count).toBe(0);
  });

  it('ignores rows dated outside the current year', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-25T12:00:00Z'));

    server.use(
      http.get('https://supabase.test/rest/v1/fire_incidents', () =>
        HttpResponse.json([
          { datetime: '2026-03-04T10:00:00Z' },
          { datetime: '2027-01-02T10:00:00Z' },
        ]),
      ),
    );

    const { stats, monthly } = await getFireYearActivity();

    expect(stats).toEqual({ month: 0, year: 1 });
    expect(monthly.find((m) => m.month === 1)?.count).toBe(0);
    expect(monthly.find((m) => m.month === 3)?.count).toBe(1);
  });
});

// Scheme + host are what this schema guards. Odd path contents (parentheses,
// semicolons) are intentionally NOT filtered: the CSS `url()` interpolation that
// made them exploitable was removed from app/layout.tsx, and every remaining
// consumer puts the value in an attribute that React/Next escapes.
describe('PhotoUrlSchema', () => {
  it('accepts an https URL on the configured Supabase host', () => {
    expect(
      PhotoUrlSchema.safeParse('https://supabase.test/storage/photo.jpg')
        .success,
    ).toBe(true);
  });

  it.each([
    ['javascript: scheme', 'javascript:alert(1)'],
    ['data: scheme', 'data:text/html,<script>alert(1)</script>'],
    ['plain http', 'http://supabase.test/storage/photo.jpg'],
    ['foreign host', 'https://evil.test/photo.jpg'],
    ['not a url at all', 'not-a-url'],
  ])('rejects %s', (_label, value) => {
    expect(PhotoUrlSchema.safeParse(value).success).toBe(false);
  });
});

describe('getFireIncidents validation', () => {
  it('rejects the whole response when a row carries a disallowed photo host', async () => {
    server.use(
      http.get('https://supabase.test/rest/v1/fire_incidents', () =>
        HttpResponse.json([
          {
            id: 1,
            datetime: '2026-08-22T10:00:00Z',
            photo_url: 'https://evil.test/photo.jpg',
            street: 'Stefan cel Mare',
          },
        ]),
      ),
    );

    await expect(getFireIncidents()).rejects.toThrow('Invalid data');
  });
});

// source_url lands in an href and in `new URL()` during render, so it degrades
// to '' rather than rejecting the row — the link is optional decoration.
describe('SourceUrlSchema', () => {
  it.each([
    ['an https article url', 'https://stiri.md/article/123'],
    ['an http article url', 'http://stiri.md/article/123'],
  ])('passes through %s', (_label, value) => {
    expect(SourceUrlSchema.parse(value)).toBe(value);
  });

  it.each([
    ['javascript: scheme', 'javascript:alert(1)'],
    ['data: scheme', 'data:text/html,<script>alert(1)</script>'],
    ['a non-empty non-url', 'see the evening news'],
    ['an empty string', ''],
    ['a missing value', undefined],
  ])('degrades %s to an empty string', (_label, value) => {
    expect(SourceUrlSchema.parse(value)).toBe('');
  });

  it('strips an unusable source without dropping the incident', async () => {
    server.use(
      http.get('https://supabase.test/rest/v1/fire_incidents', () =>
        HttpResponse.json([
          {
            id: 1,
            datetime: '2026-08-22T10:00:00Z',
            photo_url: 'https://supabase.test/storage/photo.jpg',
            street: 'Stefan cel Mare',
            source_url: 'javascript:alert(1)',
          },
        ]),
      ),
    );

    const [incident] = await getFireIncidents();
    expect(incident.street).toBe('Stefan cel Mare');
    expect(incident.source_url).toBe('');
  });
});
