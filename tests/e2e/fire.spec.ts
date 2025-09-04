import { test, expect } from '@playwright/test';

test('home page shows fire status', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/NO|YES/)).toBeVisible();
});
