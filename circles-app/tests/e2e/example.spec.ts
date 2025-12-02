import { test, expect } from '@playwright/test';

test('landing page routes to connect wallet', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /connect wallet/i }).click();
  await expect(page).toHaveURL(/connect-wallet/);
  await expect(page.getByRole('heading', { name: /access circles/i })).toBeVisible();
});
