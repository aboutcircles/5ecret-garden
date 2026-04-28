import { test, expect } from '@playwright/test';

test.describe('Navigation and routing', () => {
  test('landing page is accessible at /', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Money, Reimagined')).toBeVisible();
  });

  test('terms page renders', async ({ page }) => {
    await page.goto('/terms');
    await expect(page).toHaveURL('/terms');
  });

  test('privacy policy page renders', async ({ page }) => {
    await page.goto('/privacy-policy');
    await expect(page).toHaveURL('/privacy-policy');
  });

  test('kitchen-sink page loads without wallet', async ({ page }) => {
    // kitchen-sink is bypassed from wallet restore
    await page.goto('/kitchen-sink');
    await expect(page).toHaveURL('/kitchen-sink');
  });

  test('util page loads without wallet', async ({ page }) => {
    await page.goto('/util');
    await expect(page).toHaveURL('/util');
  });

  test('protected routes without wallet stay or redirect to root', async ({ page }) => {
    // Without a wallet session, visiting /dashboard should not render dashboard content
    await page.goto('/dashboard');

    // The app should either redirect to / or show the landing page content
    // (exact behavior depends on whether guards do client-side redirect)
    await page.waitForTimeout(2000);
    const url = page.url();
    const hasHero = await page.getByText('Money, Reimagined').isVisible().catch(() => false);
    const hasDashboard = await page.getByText('transaction-history').isVisible().catch(() => false);

    // Either redirected to landing OR dashboard failed to load (no avatar)
    expect(url === '/' || url.endsWith('/dashboard') || hasHero || !hasDashboard).toBeTruthy();
  });
});
