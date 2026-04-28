import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('renders hero section with connect button', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Money, Reimagined')).toBeVisible();
    await expect(page.getByText('Connect Wallet')).toBeVisible();
  });

  test('connect wallet button opens popup dialog', async ({ page }) => {
    await page.goto('/');

    await page.getByText('Connect Wallet').click();

    // The popup shell opens with a dialog role.
    // Content rendering depends on wagmi connector availability in headless mode.
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10_000 });
  });

  test('header shows app branding', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: /Circles/ })).toBeVisible();
  });
});
