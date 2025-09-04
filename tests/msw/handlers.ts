import { http, HttpResponse } from 'msw';

const SUPABASE_URL = 'https://supabase.test';

export const handlers = [
  http.get(`${SUPABASE_URL}/rest/v1/fire_incidents`, () =>
    HttpResponse.json([
      {
        id: 1,
        datetime: '2024-09-01T10:00:00Z',
        photo_url: 'http://example.com/photo.jpg',
        street: 'Stefan cel Mare',
      },
    ]),
  ),
];
