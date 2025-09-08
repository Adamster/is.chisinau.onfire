import { test, expect } from '@playwright/test';

test('home page shows fire status', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/NO|YES/)).toBeVisible();

  const counter = page.getByTestId('countdown');
  await expect(counter).toBeVisible();

  const first = await counter.textContent();
  await page.waitForTimeout(1100);
  const second = await counter.textContent();
  expect(first).not.toBe(second);

  const stats = page.getByTestId('stats');
  await expect(stats).toBeVisible();
  await expect(stats).toHaveText('1 this month / 2 this year');
});
