import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

/**
 * Columns we actually render. Listed explicitly rather than `*` so a future
 * column (internal notes, reporter contact, ...) is not shipped to the browser
 * by accident.
 */
const INCIDENT_COLUMNS = 'id,datetime,photo_url,street,source_url';

/**
 * `z.string().url()` is scheme-agnostic: it accepts `javascript:`, `data:` and
 * URLs whose path contains CSS-significant characters. `photo_url` reaches an
 * `<Image src>` and the OpenGraph card, so require https.
 *
 * Scheme is the whole security property here, and deliberately the only one.
 * This used to also require a host on `ALLOWED_IMAGE_HOSTS`, which took
 * production down: incident photos are hotlinked from whichever outlet reported
 * the fire (`https://ziua.md/wp-content/uploads/...`), never from Supabase
 * storage, so every row failed — and one failed row fails the whole array parse,
 * so the entire feed rendered as "Could not load incidents." A host allowlist
 * cannot be a correctness gate for data we do not host. What the allowlist still
 * governs is whether `next/image` may proxy the photo; unlisted hosts render
 * `unoptimized`. See `ALLOWED_IMAGE_HOSTS` in ../config.
 */
function isHttpsUrl(raw: string): boolean {
  try {
    return new URL(raw).protocol === 'https:';
  } catch {
    return false;
  }
}

export const PhotoUrlSchema = z
  .string()
  .url()
  .refine(isHttpsUrl, 'photo_url must be an https URL');

/**
 * `source_url` is rendered as an `href` and passed to `new URL()` during render,
 * so an unvalidated string is two bugs at once: `javascript:...` executes on
 * click (an href is not an <img src>, and the CSP cannot help — `script-src`
 * needs 'unsafe-inline' here, which permits javascript: URIs), and a non-empty
 * non-URL throws and blanks the page.
 *
 * Unlike `photo_url`, an unusable value degrades to '' instead of rejecting the
 * row: the source link is optional decoration, so losing it beats losing the
 * whole incident feed. That includes SQL NULL — the column was added after rows
 * already existed, so every backfilled row arrives as `null`, and `.default('')`
 * covers only `undefined`. A strict `z.string()` there fails the array parse and
 * takes the entire feed down with it.
 */
function isHttpUrl(raw: string): boolean {
  if (!raw) return false;
  try {
    const { protocol } = new URL(raw);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export const SourceUrlSchema = z
  .string()
  .nullish()
  .transform((raw) => (raw && isHttpUrl(raw) ? raw : ''));

export const FireIncidentSchema = z.object({
  id: z.number(),
  datetime: z.string(),
  photo_url: PhotoUrlSchema,
  street: z.string(),
  source_url: SourceUrlSchema,
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
