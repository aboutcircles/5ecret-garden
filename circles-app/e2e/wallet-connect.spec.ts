import { test, expect } from '@playwright/test';

test.describe('Wallet connection flow', () => {
  test('connect wallet click opens popup dialog', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Connect Wallet').click();

    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10_000 });
  });

  test('import-circles-garden page loads', async ({ page }) => {
    await page.goto('/connect-wallet/import-circles-garden');
    await expect(page).toHaveURL(/import-circles-garden/);
  });

  test('connect-safe page loads', async ({ page }) => {
    await page.goto('/connect-wallet/connect-safe');
    await expect(page).toHaveURL(/connect-safe/);
  });
});
