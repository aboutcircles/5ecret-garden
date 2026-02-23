/**
 * Miniapp detection and initialization.
 *
 * When the app is loaded inside an iframe (Circles newCore marketplace),
 * this module:
 *  1. Detects the iframe context
 *  2. Uses @aboutcircles/miniapp-sdk to receive the wallet address from the parent
 *  3. Initializes the Circles SDK with a MiniappContractRunner
 *  4. Reacts to wallet connect/disconnect events from the parent
 */

import { Sdk } from '@circles-sdk/sdk';
import { MiniappContractRunner } from '$lib/utils/MiniappContractRunner';
import { wallet } from '$lib/stores/wallet.svelte';
import { circles } from '$lib/stores/circles';
import { avatarState } from '$lib/stores/avatar.svelte';
import { getCirclesConfig } from '$lib/utils/helpers';
import { settings } from '$lib/stores/settings.svelte';
import { goto } from '$app/navigation';
import type { Address } from '@circles-sdk/utils';
import { gnosisConfig } from '$lib/circlesConfig';
import { onWalletChange } from '@aboutcircles/miniapp-sdk';

/** True when the app is running inside an iframe */
export const isMiniapp: boolean =
  typeof window !== 'undefined' && window.parent !== window;

export let miniappState: {
  active: boolean;
  walletAddress: string | null;
  initialized: boolean;
  error: string | null;
} = $state({
  active: false,
  walletAddress: null,
  initialized: false,
  error: null,
});

/**
 * Initialize the miniapp integration. Call once from +layout.svelte onMount.
 * Registers an onWalletChange listener via the miniapp SDK which handles
 * the request_address postMessage automatically.
 */
export function initMiniapp() {
  if (!isMiniapp) return;

  miniappState.active = true;

  onWalletChange(async (address: string | null) => {
    if (address) {
      // Skip if same wallet already initialized
      if (miniappState.walletAddress === address && miniappState.initialized) return;

      miniappState.walletAddress = address;
      await _initializeSdk(address as Address);
    } else {
      // Parent disconnected wallet
      miniappState.walletAddress = null;
      miniappState.initialized = false;

      Object.assign(avatarState, {
        avatar: undefined,
        isGroup: undefined,
        groupType: undefined,
        profile: undefined,
      });
      circles.set(undefined);
      wallet.set(undefined);
    }
  });
}

async function _initializeSdk(address: Address) {
  try {
    miniappState.error = null;

    const rpcUrl = settings.ring
      ? gnosisConfig.rings.circlesRpcUrl
      : gnosisConfig.production.circlesRpcUrl;

    const runner = new MiniappContractRunner(address, rpcUrl);
    wallet.set(runner);

    const circlesConfig = await getCirclesConfig(100n, settings.ring);
    const sdk = new Sdk(runner, circlesConfig);
    circles.set(sdk);

    const avatarInfo = await sdk.data.getAvatarInfo(address);

    if (avatarInfo) {
      avatarState.avatar = await sdk.getAvatar(address);
      miniappState.initialized = true;
      await goto('/dashboard');
    } else {
      miniappState.initialized = true;
      await goto('/register');
    }
  } catch (err) {
    console.error('[miniapp] Failed to initialize SDK:', err);
    miniappState.error = err instanceof Error ? err.message : String(err);
  }
}
