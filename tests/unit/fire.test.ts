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
  it.each([
    ['the configured Supabase host', 'https://supabase.test/storage/photo.jpg'],
    // Real production shape: photos are hotlinked from the outlet that reported
    // the fire. Requiring an allowlisted host here failed every row, and one bad
    // row fails the whole array parse, so the feed died entirely.
    ['a third-party news host', 'https://ziua.md/wp-content/uploads/i.jpg'],
  ])('accepts an https URL on %s', (_label, value) => {
    expect(PhotoUrlSchema.safeParse(value).success).toBe(true);
  });

  it.each([
    ['javascript: scheme', 'javascript:alert(1)'],
    ['data: scheme', 'data:text/html,<script>alert(1)</script>'],
    ['plain http', 'http://supabase.test/storage/photo.jpg'],
    ['not a url at all', 'not-a-url'],
  ])('rejects %s', (_label, value) => {
    expect(PhotoUrlSchema.safeParse(value).success).toBe(false);
  });
});

describe('getFireIncidents validation', () => {
  it('keeps a feed whose photos are hotlinked from a news site', async () => {
    server.use(
      http.get('https://supabase.test/rest/v1/fire_incidents', () =>
        HttpResponse.json([
          {
            id: 28,
            datetime: '2026-06-08T06:58:50+00:00',
            photo_url:
              'https://ziua.md/wp-content/uploads/2026/06/incendiu.jpg',
            street: 'strada Pușkin 62',
            source_url: 'https://ziua.md/incendiu-langa-sediul/',
          },
        ]),
      ),
    );

    const [incident] = await getFireIncidents();
    expect(incident.street).toBe('strada Pușkin 62');
  });

  it('rejects the whole response when a row carries an unusable photo scheme', async () => {
    server.use(
      http.get('https://supabase.test/rest/v1/fire_incidents', () =>
        HttpResponse.json([
          {
            id: 1,
            datetime: '2026-08-22T10:00:00Z',
            photo_url: 'javascript:alert(1)',
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
    // Rows predating the column arrive as SQL NULL, which `.default('')` — it
    // only fires on undefined — would have rejected, failing the whole feed.
    ['a null column', null],
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

  it('keeps the feed when a backfilled row has a null source_url', async () => {
    server.use(
      http.get('https://supabase.test/rest/v1/fire_incidents', () =>
        HttpResponse.json([
          {
            id: 1,
            datetime: '2026-08-22T10:00:00Z',
            photo_url: 'https://supabase.test/storage/photo.jpg',
            street: 'Stefan cel Mare',
            source_url: null,
          },
        ]),
      ),
    );

    const [incident] = await getFireIncidents();
    expect(incident.street).toBe('Stefan cel Mare');
    expect(incident.source_url).toBe('');
  });
});
