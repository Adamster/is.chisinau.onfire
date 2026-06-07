import { http, HttpResponse } from 'msw';

const SUPABASE_URL = 'https://supabase.test';

const incidents = [
  {
    id: 1,
    datetime: '2024-09-01T10:00:00Z',
    photo_url: 'http://example.com/photo.jpg',
    street: 'Stefan cel Mare',
    source_url: 'https://stiri.md/article/123',
  },
  {
    id: 2,
    datetime: '2024-06-15T10:00:00Z',
    photo_url: 'http://example.com/photo2.jpg',
    street: 'Dacia',
    source_url: '',
  },
  {
    id: 3,
    datetime: '2023-12-31T10:00:00Z',
    photo_url: 'http://example.com/photo3.jpg',
    street: 'Independence',
    source_url: '',
  },
];

export const handlers = [
  http.get(`${SUPABASE_URL}/rest/v1/fire_incidents`, ({ request }) => {
    const url = new URL(request.url);
    const datetime = url.searchParams.get('datetime');
    if (datetime?.startsWith('gte.')) {
      const iso = datetime.slice(4);
      return HttpResponse.json(
        incidents.filter((i) => new Date(i.datetime) >= new Date(iso)),
      );
    }
    return HttpResponse.json(incidents);
  }),
];
