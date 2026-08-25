import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  ALLOWED_IMAGE_HOSTS,
} from '../config';

/**
 * Columns we actually render. Listed explicitly rather than `*` so a future
 * column (internal notes, reporter contact, ...) is not shipped to the browser
 * by accident.
 */
const INCIDENT_COLUMNS = 'id,datetime,photo_url,street';

/**
 * `z.string().url()` is scheme-agnostic: it accepts `javascript:`, `data:` and
 * URLs whose path contains CSS-significant characters. `photo_url` reaches an
 * `<Image src>` and the OpenGraph card, so restrict it to https on a known host.
 * With no hosts configured we still enforce https rather than failing closed.
 */
function isAllowedPhotoUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  return ALLOWED_IMAGE_HOSTS.length === 0
    ? true
    : ALLOWED_IMAGE_HOSTS.includes(url.host);
}

export const PhotoUrlSchema = z
  .string()
  .url()
  .refine(
    isAllowedPhotoUrl,
    'photo_url must be an https URL on an allowed host',
  );

export const FireIncidentSchema = z.object({
  id: z.number(),
  datetime: z.string(),
  photo_url: PhotoUrlSchema,
  street: z.string(),
});

export type FireIncident = z.infer<typeof FireIncidentSchema>;

let cachedClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (cachedClient) {
    return cachedClient;
  }

  if (!SUPABASE_URL) {
    throw new Error('Supabase URL is not configured.');
  }

  if (!SUPABASE_ANON_KEY) {
    throw new Error('Supabase anon key is not configured.');
  }

  cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cachedClient;
}

/**
 * Newest-first incident list for the sidebar and the selected-photo background.
 * Bounded: the sidebar only ever shows recent history, and an unbounded
 * `select` grows without limit as the table does.
 */
export const INCIDENT_LIST_LIMIT = 100;

export async function getFireIncidents(
  limit: number = INCIDENT_LIST_LIMIT,
): Promise<FireIncident[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('fire_incidents')
    .select(INCIDENT_COLUMNS)
    .order('datetime', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  const parsed = z.array(FireIncidentSchema).safeParse(data);
  if (!parsed.success) {
    throw new Error('Invalid data');
  }

  return parsed.data;
}

export async function getLastFire(): Promise<FireIncident | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('fire_incidents')
    .select(INCIDENT_COLUMNS)
    .order('datetime', { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  const parsed = z.array(FireIncidentSchema).safeParse(data);
  if (!parsed.success) {
    throw new Error('Invalid data');
  }

  return parsed.data[0] ?? null;
}

export const FireMonthlyStatsSchema = z.array(
  z.object({ month: z.number().min(1).max(12), count: z.number().min(0) }),
);
export type FireMonthlyStats = z.infer<typeof FireMonthlyStatsSchema>;

export const FireStatsSchema = z.object({
  month: z.number(),
  year: z.number(),
});

export type FireStats = z.infer<typeof FireStatsSchema>;

export type FireYearActivity = {
  stats: FireStats;
  monthly: FireMonthlyStats;
};

const YearRowSchema = z.object({ datetime: z.string() });

/**
 * Month count, year count and the per-month chart from a single query.
 *
 * Previously this was three round trips (`getFireStats` fetched every row of the
 * month *and* every row of the year, `getFireIncidentsByMonth` fetched the year
 * again) each pulling full rows in order to call `.length` on them. One
 * datetime-only query over the current year serves all three.
 */
export async function getFireYearActivity(): Promise<FireYearActivity> {
  const client = getSupabaseClient();
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1).toISOString();

  const { data, error } = await client
    .from('fire_incidents')
    .select('datetime')
    .gte('datetime', startOfYear);

  if (error) throw error;

  const rows = z.array(YearRowSchema).parse(data ?? []);
  const monthly = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    count: 0,
  }));

  const currentMonth = now.getMonth();
  let monthCount = 0;
  let yearCount = 0;

  for (const row of rows) {
    const date = new Date(row.datetime);
    // `gte` has no upper bound, so a future-dated row could land in the wrong year.
    if (date.getFullYear() !== year) continue;
    monthly[date.getMonth()].count++;
    yearCount++;
    if (date.getMonth() === currentMonth) monthCount++;
  }

  return {
    stats: FireStatsSchema.parse({ month: monthCount, year: yearCount }),
    monthly: FireMonthlyStatsSchema.parse(monthly),
  };
}
