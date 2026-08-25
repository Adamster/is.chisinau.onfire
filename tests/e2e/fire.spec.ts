import { test, expect } from '@playwright/test';

test('home page shows fire status', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    /^(YES|NO)$/,
  );

  const counter = page.getByTestId('countdown');
  await expect(counter).toBeVisible();

  const first = await counter.textContent();
  await page.waitForTimeout(1100);
  const second = await counter.textContent();
  expect(first).not.toBe(second);

  // Counts are derived from the clock, so assert the shape rather than literal
  // numbers — a hardcoded expectation here silently rots as time passes.
  const stats = page.getByTestId('stats');
  await expect(stats).toBeVisible();
  await expect(stats).toHaveText(/^\d+ this month\s*\/\s*\d+ this year$/);
});

test('incident sidebar is inert until opened', async ({ page }) => {
  await page.goto('/');

  const sidebar = page.locator('#incident-sidebar');
  await expect(sidebar).toHaveAttribute('inert', '');

  await page.getByRole('button', { name: 'Show incident list' }).click();
  await expect(sidebar).not.toHaveAttribute('inert', '');
  await expect(
    sidebar.getByRole('heading', { name: 'Incident History' }),
  ).toBeVisible();

  const incidentButtons = sidebar.getByRole('button', { pressed: false });
  await expect(incidentButtons.first()).toBeVisible();
});
