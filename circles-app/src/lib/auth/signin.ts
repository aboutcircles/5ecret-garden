import { browser } from '$app/environment';
import { ensureGnosisChain } from '$lib/chain/gnosis';
import { getMarketClient } from '$lib/sdk/marketClient';
import { getWalletProvider } from '$lib/ethereum/getWalletProvider';
import {gnosisConfig} from "$lib/circlesConfig";

/**
 * Sign in with a Safe on the Gnosis chain.
 * Note: Currently only Gnosis (chainId 100) is supported. Passing any other chainId will throw.
 */
export async function signInWithSafe(
  avatar: string,
  chainId: number = gnosisConfig.production.marketChainId,
): Promise<{ address: string; chainId: number }> {
  if (!browser) {
    throw new Error('signInWithSafe() can only be used in the browser');
  }

  if (chainId !== gnosisConfig.production.marketChainId) {
    throw new Error(
      `signInWithSafe currently supports only Gnosis chain (${gnosisConfig.production.marketChainId}); received ${chainId}`,
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
