// src/lib/sdk/marketClient.ts
import { browser } from '$app/environment';
import { MarketplaceClient } from '@circles-market/sdk';
import { PersistentAuthContext } from './persistentAuthContext';
import { getActiveConfig, settings } from '$lib/shared/state/settings.svelte';

let client: MarketplaceClient | null = null;
let clientBase: string | null = null;

/**
 * Resolve the market-api base for the active environment.
 *
 * The in-app Production/Staging toggle is authoritative: `getActiveConfig()` already
 * resolves the correct host for the selected server (repointing to the staging
 * market-api when Staging is active). `VITE_MARKET_API_BASE` is a LOCAL-DEV escape
 * hatch only — honored on the default production server so a developer can aim at a
 * local market-api, but it must NOT override an explicit Staging selection.
 *
 * Why the runtime `settings.server` guard matters: deployed builds bake
 * `VITE_MARKET_API_BASE` to the production host, and because it is a truthy build-time
 * constant, a plain `VITE || getActiveConfig()...` constant-folds to the VITE value —
 * eliminating the getActiveConfig() call entirely and stranding the toggle (only the
 * non-client `/api/sellers` path, which reads getActiveConfig() directly, would move).
 * Gating the VITE read behind the runtime server check keeps getActiveConfig() live.
 *
 * Trailing slash stripped for consistent path joins.
 */
export function resolveMarketApiBase(): string {
  const cfg = getActiveConfig();
  const devOverride =
    settings.server === 'staging' ? undefined : import.meta.env.VITE_MARKET_API_BASE;
  const base = devOverride || cfg.marketApiBase || 'http://localhost:5084';
  return String(base).replace(/\/$/, '');
}

/**
 * Returns a singleton MarketplaceClient for the active environment. The client is
 * rebuilt when the resolved base changes — e.g. the user flips the Production/Staging
 * server toggle — so no page reload is needed and no call ever leaks to the previous
 * environment. Auth tokens are namespaced per base (see PersistentAuthContext), so
 * prod and staging sessions coexist rather than clobbering each other.
 *
 * Only available in the browser.
 */
export function getMarketClient(): MarketplaceClient {
  if (!browser) {
    throw new Error('getMarketClient() can only be used in the browser');
  }
  const marketApiBase = resolveMarketApiBase();
  if (!client || clientBase !== marketApiBase) {
    client = new MarketplaceClient({
      marketApiBase,
      authContext: new PersistentAuthContext(marketApiBase),
    });
    clientBase = marketApiBase;
  }
  return client;
}
