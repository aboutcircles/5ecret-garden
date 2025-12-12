import { browser } from '$app/environment';
import { GNOSIS_CHAIN_ID_NUM } from '$lib/config/market';
import { ensureGnosisChain } from '$lib/chain/gnosis';
import { getMarketClient } from '$lib/sdk/marketClient';

export async function signInWithSafe(
  avatar: string,
  chainId: number = GNOSIS_CHAIN_ID_NUM,
): Promise<{ address: string; chainId: number }> {
  if (!browser) {
    throw new Error('signInWithSafe() can only be used in the browser');
  }

  const ethereum: any = (window as any)?.ethereum;
  if (!ethereum?.request) {
    throw new Error('No injected provider available (window.ethereum missing)');
  }

  await ensureGnosisChain(ethereum);

  return await getMarketClient().auth.signInWithAvatar({
    avatar,
    ethereum,
    chainId,
  });
}
