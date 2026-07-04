import { afterEach, describe, expect, it } from 'vitest';
import { resolveMarketApiBase } from '$lib/shared/integrations/market/marketClient';
import { updateSettings } from '$lib/shared/state/settings.svelte';

/**
 * The SDK market client (catalog/cart/checkout/payment) must follow the
 * Production/Staging toggle. Regression guard for the constant-fold bug: a build-time
 * VITE_MARKET_API_BASE baked to the production host used to win over getActiveConfig()
 * and strand getMarketClient() on prod even when Staging was selected.
 */
describe('resolveMarketApiBase() honors the server toggle', () => {
  afterEach(() => {
    updateSettings({ server: undefined, network: 'gnosis', ring: false });
  });

  it('returns the staging market-api when server=staging (toggle wins over any VITE override)', () => {
    updateSettings({ server: 'staging' });
    // The key regression assertion: even with VITE_MARKET_API_BASE set (as it is in the
    // local/dev env), an explicit Staging selection resolves to the staging market-api —
    // it is not stranded on the VITE-baked host.
    expect(resolveMarketApiBase()).toBe('https://market-api.staging.aboutcircles.com');
  });

  it('does not resolve to the staging host on the default production server', () => {
    updateSettings({ server: 'production' });
    // Production (or unset) yields the prod host or a local VITE override — never staging.
    expect(resolveMarketApiBase()).not.toContain('market-api.staging.aboutcircles.com');
  });
});
