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

let getLastFire: (typeof import('../../src/shared/api/fire'))['getLastFire'];
let getFireStats: (typeof import('../../src/shared/api/fire'))['getFireStats'];
let getFireIncidents: (typeof import('../../src/shared/api/fire'))['getFireIncidents'];
let PhotoUrlSchema: (typeof import('../../src/shared/api/fire'))['PhotoUrlSchema'];

beforeAll(async () => {
  server.listen();
  ({ getLastFire, getFireStats, getFireIncidents, PhotoUrlSchema } =
    await import('../../src/shared/api/fire'));
});

afterEach(() => server.resetHandlers());
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
    expect(incidents).toHaveLength(3);
    expect(incidents[0].id).toBe(1);
    expect(new Date(incidents[0].datetime).getTime()).toBeGreaterThan(
      new Date(incidents[1].datetime).getTime(),
    );
  });
});

describe('getFireStats', () => {
  it('counts fires for month and year', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-09-10T12:00:00Z'));
    const stats = await getFireStats();
    expect(stats).toEqual({ month: 1, year: 2 });
    vi.useRealTimers();
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
            datetime: '2024-09-01T10:00:00Z',
            photo_url: 'https://evil.test/photo.jpg',
            street: 'Stefan cel Mare',
          },
        ]),
      ),
    );

    await expect(getFireIncidents()).rejects.toThrow('Invalid data');
  });
});
