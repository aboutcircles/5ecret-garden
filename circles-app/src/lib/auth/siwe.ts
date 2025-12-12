import { browser } from '$app/environment';
import { getMarketClient } from '$lib/sdk/marketClient';

export function getAuthMeta(): { address: string; chainId: number } | null {
  if (!browser) {
    return null;
  }
  return getMarketClient().auth.getAuthMeta();
}

export function signOut(): void {
  if (!browser) {
    return;
  }
  getMarketClient().auth.signOut();
}
