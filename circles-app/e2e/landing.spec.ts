import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('renders hero section with connect button', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Money, reimagined.')).toBeVisible();
    await expect(page.getByText('Connect Wallet')).toBeVisible();
  });

  test('connect wallet button opens popup dialog', async ({ page }) => {
    await page.goto('/');

    await page.getByText('Connect Wallet').click();

    // The popup shell opens with a dialog role.
    // Content rendering depends on wagmi connector availability in headless mode.
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10_000 });
  });

  test('landing shows app branding', async ({ page }) => {
    await page.goto('/');

    // Desktop landing shows branding via the hero logo; the nav header is
    // mobile-only (md:hidden) since the sidebar provides nav once signed in.
    await expect(page.getByRole('img', { name: 'Circles', exact: true })).toBeVisible();
  });
});
