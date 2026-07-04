// src/lib/sdk/marketClient.ts
import { browser } from '$app/environment';
import { MarketplaceClient } from '@circles-market/sdk';
import { PersistentAuthContext } from './persistentAuthContext';
import { getActiveConfig } from '$lib/shared/state/settings.svelte';

let client: MarketplaceClient | null = null;
let clientBase: string | null = null;

/**
 * Resolve the market-api base for the active environment.
 *
 * Precedence: a build-time `VITE_MARKET_API_BASE` pins the base (and, being
 * build-time, disables the runtime Production/Staging toggle); otherwise the base
 * comes from `getActiveConfig().marketApiBase`, which the server toggle repoints at
 * the staging market-api. Trailing slash stripped for consistent path joins.
 */
function resolveMarketApiBase(): string {
  const base =
    import.meta.env.VITE_MARKET_API_BASE ||
    getActiveConfig().marketApiBase ||
    'http://localhost:5084';
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
