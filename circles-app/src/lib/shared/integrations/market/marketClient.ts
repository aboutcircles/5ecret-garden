// src/lib/sdk/marketClient.ts
import { browser } from '$app/environment';
import { MarketplaceClient } from '@circles-market/sdk';
import { PersistentAuthContext } from './persistentAuthContext';
import {gnosisMarketConfig} from "$lib/shared/config/market";

let client: MarketplaceClient | null = null;

/**
 * Returns a singleton CirclesClient instance.
 * Only available in the browser.
 */
export function getMarketClient(): MarketplaceClient {
  if (!browser) {
    throw new Error('getMarketClient() can only be used in the browser');
  }
  if (!client) {
    const base = (import.meta as any)?.env?.VITE_MARKET_API_BASE || gnosisMarketConfig.marketApiBase || 'http://localhost:5084';
    const marketApiBase = String(base).replace(/\/$/, '');
    client = new MarketplaceClient({ marketApiBase, authContext: new PersistentAuthContext() });
  }
  return client;
}
