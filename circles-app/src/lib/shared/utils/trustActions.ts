import { get } from 'svelte/store';
import { ethers } from 'ethers';
import type { Address } from '@aboutcircles/sdk-types';

import { avatarState } from '$lib/shared/state/avatar.svelte';
import { circles } from '$lib/shared/state/circles';
import { wallet } from '$lib/shared/state/wallet.svelte';
import { runTask } from '$lib/shared/utils/tasks';
import { shortenAddress } from '$lib/shared/utils/shared';

export async function addTrustRelations(params: {
  actorType: 'avatar' | 'group' | 'gateway';
  actorAddress: Address;
  trustTargets: Address[];
  gatewayExpiry?: bigint;
}): Promise<void> {
  const trustTargets = (params.trustTargets ?? []).filter(Boolean);
  if (trustTargets.length === 0) return;

  if (params.actorType === 'avatar') {
    if (!avatarState.avatar) {
      throw new Error('Avatar store not available');
    }

    await runTask({
      name: `${shortenAddress(params.actorAddress)} trusts ${trustTargets.length} avatar${trustTargets.length === 1 ? '' : 's'} ...`,
      promise: avatarState.avatar.trust(trustTargets),
    });
    return;
  }

  if (params.actorType === 'group') {
    const sdk = get(circles);
    if (!sdk) {
      throw new Error('Circles SDK not available');
    }

    const groupAvatar = await sdk.getAvatar(params.actorAddress);
    await runTask({
      name: `${shortenAddress(params.actorAddress)} trusts ${trustTargets.length} avatar${trustTargets.length === 1 ? '' : 's'} ...`,
      promise: groupAvatar.trust(trustTargets),
    });
    return;
  }

  // gateway
  const runner = get(wallet) as any;
  if (!runner) {
    throw new Error('Wallet not connected.');
  }

  const gatewayAbi = ['function setTrust(address trustReceiver, uint96 expiry)'];
  const gatewayIface = new ethers.Interface(gatewayAbi);
  const trustExpiryMax = (1n << 96n) - 1n;
  const expiry = params.gatewayExpiry ?? trustExpiryMax;

  for (let i = 0; i < trustTargets.length; i++) {
    const trustReceiver = trustTargets[i];
    await runTask({
      name: `Updating gateway trust (${i + 1}/${trustTargets.length})…`,
      promise: (async () => {
        const data = gatewayIface.encodeFunctionData('setTrust', [trustReceiver, expiry]);
        const tx = await runner.sendTransaction({
          to: params.actorAddress,
          value: 0n,
          data,
        });
        await runner.provider.waitForTransaction(tx.hash);
      })(),
    });
  }
}
