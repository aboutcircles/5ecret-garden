import { browser } from '$app/environment';
import { ensureGnosisChain } from '$lib/shared/integrations/chain/gnosis';
import { getMarketClient } from '$lib/shared/data/market/marketClientProxy';
import { getWalletProvider } from '$lib/shared/integrations/wallet';
import {gnosisMarketConfig} from "$lib/shared/config/market";

/**
 * Sign in with a Safe on the Gnosis chain.
 * Note: Currently only Gnosis (chainId 100) is supported. Passing any other chainId will throw.
 */
export async function signInWithSafe(
  avatar: string,
  chainId: number = gnosisMarketConfig.marketChainId,
): Promise<{ address: string; chainId: number }> {
  if (!browser) {
    throw new Error('signInWithSafe() can only be used in the browser');
  }

  if (chainId !== gnosisMarketConfig.marketChainId) {
    throw new Error(
      `signInWithSafe currently supports only Gnosis chain (${gnosisMarketConfig.marketChainId}); received ${chainId}`,
    );
  }

  const ethereum = getWalletProvider();
  await ensureGnosisChain(ethereum);

  return await getMarketClient().auth.signInWithAvatar({
    avatar,
    ethereum,
    chainId,
  });
}
