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

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getLastFire(): Promise<FireIncident | null> {
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

export const FireStatsSchema = z.object({
  month: z.number(),
  year: z.number(),
});

export type FireStats = z.infer<typeof FireStatsSchema>;

export async function getFireStats(): Promise<FireStats> {
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
