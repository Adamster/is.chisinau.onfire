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
import { server } from '../msw/server';

let getLastFire: (typeof import('../../src/shared/api/fire'))['getLastFire'];
let getFireStats: (typeof import('../../src/shared/api/fire'))['getFireStats'];
let getFireIncidents: (typeof import('../../src/shared/api/fire'))['getFireIncidents'];

beforeAll(async () => {
  server.listen();
  ({ getLastFire, getFireStats, getFireIncidents } = await import(
    '../../src/shared/api/fire'
  ));
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
