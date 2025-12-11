// src/lib/sdk/marketClient.ts
import { browser } from '$app/environment';
import { CirclesClient } from '@circles-market/sdk';
import { MARKET_API_BASE } from '$lib/config/market';

let client: CirclesClient | null = null;

/**
 * Returns a singleton CirclesClient instance.
 * Only available in the browser.
 */
export function getMarketClient(): CirclesClient {
  if (!browser) {
    throw new Error('getMarketClient() can only be used in the browser');
  }
  if (!client) {
    const base = (import.meta as any)?.env?.VITE_MARKET_API_BASE || MARKET_API_BASE || 'http://localhost:5084';
    client = new CirclesClient({ marketApiBase: String(base).replace(/\/$/, '') });
  }
  return client;
}
