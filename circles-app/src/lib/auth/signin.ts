// src/lib/auth/signin.ts
// New thin wrappers that delegate to the Market SDK auth flow.
import type { Address } from '@circles-sdk/utils';
import { getMarketClient } from '$lib/sdk/marketClient';
import { GNOSIS_CHAIN_ID_NUM } from '$lib/config/market';

export async function signInWithAvatarSafe(avatar: Address): Promise<{ address: string; chainId: number }> {
  const anyWindow = window as any;
  const ethereum = anyWindow?.ethereum;
  if (!ethereum?.request) {
    throw new Error('No EIP-1193 wallet found (window.ethereum missing)');
    }
  const client = getMarketClient();
  return await client.auth.signInWithAvatar({ avatar, ethereum, chainId: GNOSIS_CHAIN_ID_NUM ?? 100 });
}

// Keep legacy names for compatibility if other code calls signInWithSafe.
export async function signInWithSafe(avatar: string) {
  return signInWithAvatarSafe(avatar as Address);
}

// Historic function name; if used, it should sign in by inferring the avatar elsewhere.
export async function signInWithWallet() {
  throw new Error('signInWithWallet is deprecated. Use signInWithAvatarSafe(avatar) instead.');
}
