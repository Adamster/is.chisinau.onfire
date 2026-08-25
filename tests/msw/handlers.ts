import { http, HttpResponse } from 'msw';

const SUPABASE_URL = 'https://supabase.test';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Fixtures are built per request, relative to the current clock, so they keep
 * working as time passes and so `vi.setSystemTime` in unit tests moves them too.
 * They used to be hardcoded 2024 dates while the stats queries count relative to
 * today, which quietly rotted the assertions that depended on them.
 *
 * Offsets are chosen so the newest incident is NOT today: the home page only
 * renders the countdown when there was no fire today.
 */
const OFFSETS_IN_DAYS = [3, 20, 200, 500];

function buildIncidents() {
  const now = Date.now();
  const streets = ['Stefan cel Mare', 'Dacia', 'Independence', 'Alba Iulia'];

  return OFFSETS_IN_DAYS.map((days, i) => ({
    id: i + 1,
    datetime: new Date(now - days * DAY_MS).toISOString(),
    photo_url: `${SUPABASE_URL}/storage/v1/object/public/photos/${i + 1}.jpg`,
    street: streets[i],
  }));
}

export const handlers = [
  http.get(`${SUPABASE_URL}/rest/v1/fire_incidents`, ({ request }) => {
    const url = new URL(request.url);
    const incidents = buildIncidents();

    const datetime = url.searchParams.get('datetime');
    const filtered = datetime?.startsWith('gte.')
      ? incidents.filter(
          (i) => new Date(i.datetime) >= new Date(datetime.slice(4)),
        )
      : incidents;

    const limit = Number(url.searchParams.get('limit'));
    return HttpResponse.json(
      Number.isFinite(limit) && limit > 0 ? filtered.slice(0, limit) : filtered,
    );
  }),
];
