import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  timeout: 30_000,
  testDir: '.',
  webServer: {
    command:
      'NEXT_PUBLIC_SUPABASE_URL=https://supabase.test NEXT_PUBLIC_SUPABASE_ANON_KEY=anon pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], baseURL: 'http://localhost:3000' },
    },
    {
      name: 'tablet',
      use: { ...devices['iPad (gen 7)'], baseURL: 'http://localhost:3000' },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3000' },
    },
  ],
});
