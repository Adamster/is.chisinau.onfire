import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  timeout: 30_000,
  testDir: '.',
  webServer: {
    // No env vars: dev falls back to the MSW mock origin on its own (see
    // src/shared/config.ts), so this runs the same path `pnpm dev` gives a
    // developer with no `.env.local` — which is what regressed.
    command: 'pnpm dev',
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
