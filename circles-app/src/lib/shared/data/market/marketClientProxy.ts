import { getMarketClient as getIntegratedMarketClient } from '$lib/shared/integrations/market';

/**
 * Data-layer proxy entrypoint for market SDK access.
 *
 * Keep this as a simple pass-through for now. Later we can add
 * tracing/caching/retry/feature flags here without touching callsites.
 */
export function getMarketClient() {
  return getIntegratedMarketClient();
}
