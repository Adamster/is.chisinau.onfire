import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

export const FireIncidentSchema = z.object({
  id: z.number(),
  datetime: z.string(),
  photo_url: z.string().url(),
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

export async function getFireIncidents(): Promise<FireIncident[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('fire_incidents')
    .select('*')
    .order('datetime', { ascending: false });

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
    .select('*')
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

export async function getFireIncidentsByMonth(): Promise<FireMonthlyStats> {
  const client = getSupabaseClient();
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

  const { data, error } = await client
    .from('fire_incidents')
    .select('*')
    .gte('datetime', startOfYear);

  if (error) throw error;

  const parsed = z.array(FireIncidentSchema).parse(data ?? []);
  const counts = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    count: 0,
  }));
  for (const incident of parsed) {
    const m = new Date(incident.datetime).getMonth();
    counts[m].count++;
  }
  return FireMonthlyStatsSchema.parse(counts);
}

export const FireStatsSchema = z.object({
  month: z.number(),
  year: z.number(),
});

export type FireStats = z.infer<typeof FireStatsSchema>;

export async function getFireStats(): Promise<FireStats> {
  const client = getSupabaseClient();
  const now = new Date();
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

  const [monthRes, yearRes] = await Promise.all([
    client.from('fire_incidents').select('*').gte('datetime', startOfMonth),
    client.from('fire_incidents').select('*').gte('datetime', startOfYear),
  ]);

  if (monthRes.error) throw monthRes.error;
  if (yearRes.error) throw yearRes.error;

  const stats = { month: monthRes.data.length, year: yearRes.data.length };
  return FireStatsSchema.parse(stats);
}
