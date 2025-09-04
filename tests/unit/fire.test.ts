process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';

import { beforeAll, afterEach, afterAll, describe, it, expect } from 'vitest';
import { server } from '../msw/server';

let getLastFire: (typeof import('../../src/shared/api/fire'))['getLastFire'];

beforeAll(async () => {
  server.listen();
  ({ getLastFire } = await import('../../src/shared/api/fire'));
});

afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('getLastFire', () => {
  it('fetches last fire incident', async () => {
    const incident = await getLastFire();
    expect(incident?.street).toBe('Stefan cel Mare');
  });
});
