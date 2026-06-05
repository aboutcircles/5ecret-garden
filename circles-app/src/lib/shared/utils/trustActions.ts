import { get } from 'svelte/store';
import { ethers } from 'ethers';
import type { Address } from '@aboutcircles/sdk-types';
import type { BaseGroupAvatar } from '@aboutcircles/sdk';

import { avatarState } from '$lib/shared/state/avatar.svelte';
import { circles } from '$lib/shared/state/circles';
import { wallet } from '$lib/shared/state/wallet.svelte';
import { runTask } from '$lib/shared/utils/tasks';
import { shortenAddress } from '$lib/shared/utils/shared';
import { sendRunnerTransactionAndWait } from '$lib/shared/utils/tx';
import {
  probeGroupCapabilities,
  type GroupTrustKind,
} from '$lib/areas/groups/utils/groupKind';

// 96-bit max — what `BaseGroup.trust(...)` and friends interpret as "no expiry".
const TRUST_EXPIRY_MAX = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFF');

const trustBatchWithConditionsIface = new ethers.Interface([
  'function trustBatchWithConditions(address[] _members, uint96 _expiry) external',
]);
const trustBatchWithExpiryIface = new ethers.Interface([
  'function trustBatch(address[] _members, uint96 _expiry) external',
]);
const trustBatchNoExpiryIface = new ethers.Interface([
  'function trustBatch(address[] _members) external',
]);

function encodeGroupTrustCall(
  kind: GroupTrustKind,
  members: Address[],
  expiry: bigint
): string {
  switch (kind) {
    case 'conditions':
      return trustBatchWithConditionsIface.encodeFunctionData(
        'trustBatchWithConditions',
        [members, expiry]
      );
    case 'expiry':
      return trustBatchWithExpiryIface.encodeFunctionData('trustBatch', [
        members,
        expiry,
      ]);
    case 'simple':
      // No-expiry variant; only meaningful for add (expiry param doesn't exist).
      return trustBatchNoExpiryIface.encodeFunctionData('trustBatch', [members]);
    default:
      throw new Error(
        'Unsupported group contract: unknown trust interface. The group at this address does not expose a recognized trustBatch* selector.'
      );
  }
}

// Submit a group trust mutation directly through the wallet runner. The SDK's
// BaseGroupAvatar.trust.* methods only model one of the three live group
// shapes, so we build calldata ourselves once `probeGroupCapabilities` has
// told us which selector the contract actually exposes.
async function sendGroupTrustTx(params: {
  groupAddress: Address;
  kind: GroupTrustKind;
  members: Address[];
  expiry: bigint;
  taskName: string;
}): Promise<void> {
  const runner = get(wallet);
  if (!runner?.sendTransaction) {
    throw new Error('Wallet not connected.');
  }
  const data = encodeGroupTrustCall(params.kind, params.members, params.expiry);
  await runTask({
    name: params.taskName,
    promise: sendRunnerTransactionAndWait(
      runner,
      { to: params.groupAddress, value: 0n, data },
      { label: 'Group trust update' }
    ),
  });
}

// Public helper: submit a group untrust (expiry=0). Throws if the group's
// contract type has no on-chain owner-remove path.
export async function removeGroupMembers(
  groupAddress: Address,
  members: Address[]
): Promise<void> {
  if (members.length === 0) return;
  const caps = await probeGroupCapabilities(groupAddress);
  if (!caps.ownerRemove) {
    throw new Error(
      'This group does not support owner-side member removal. Members leave via opt-out.'
    );
  }
  await sendGroupTrustTx({
    groupAddress,
    kind: caps.trustKind,
    members,
    expiry: 0n,
    taskName: `Removing ${members.length} trusted avatar${members.length === 1 ? '' : 's'} from ${shortenAddress(groupAddress)} ...`,
  });
}

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
      promise: avatarState.avatar.trust.add(trustTargets),
    });
    return;
  }

  if (params.actorType === 'group') {
    const sdk = get(circles);
    if (!sdk) {
      throw new Error('Circles SDK not available');
    }

    const caps = await probeGroupCapabilities(params.actorAddress);
    const taskName = `${shortenAddress(params.actorAddress)} trusts ${trustTargets.length} avatar${trustTargets.length === 1 ? '' : 's'} ...`;

    // SDK fast path: the `conditions` variant is the only one the SDK
    // properly models. Keep using it so the SDK's own contract-runner
    // observability stays in the loop for this shape. The other two we
    // dispatch directly via the wallet runner because the SDK builds
    // selectors that don't exist on those contracts.
    if (caps.trustKind === 'conditions') {
      const groupAvatar = await sdk.getAvatar(params.actorAddress, false);
      await runTask({
        name: taskName,
        promise: (groupAvatar as BaseGroupAvatar).trust.addBatchWithConditions(
          trustTargets,
          TRUST_EXPIRY_MAX
        ),
      });
      return;
    }

    if (caps.trustKind === 'expiry' || caps.trustKind === 'simple') {
      await sendGroupTrustTx({
        groupAddress: params.actorAddress,
        kind: caps.trustKind,
        members: trustTargets,
        expiry: TRUST_EXPIRY_MAX,
        taskName,
      });
      return;
    }

    // `unknown` shape — surface a clear error instead of sending a
    // selector that the contract doesn't have (which is what produced the
    // silent "execTransaction reverted" empty-data revert before this fix).
    throw new Error(
      'Unsupported group contract type at ' +
        params.actorAddress +
        '. Could not detect a known trustBatch* selector in its bytecode.'
    );
  }

  // gateway
  const runner = get(wallet);
  if (!runner?.sendTransaction) {
    throw new Error('Wallet not connected.');
  }

  const gatewayAbi = ['function setTrust(address trustReceiver, uint96 expiry)'];
  const gatewayIface = new ethers.Interface(gatewayAbi);
  const expiry = params.gatewayExpiry ?? TRUST_EXPIRY_MAX;

  for (let i = 0; i < trustTargets.length; i++) {
    const trustReceiver = trustTargets[i];
    await runTask({
      name: `Updating gateway trust (${i + 1}/${trustTargets.length})…`,
      promise: (async () => {
        const data = gatewayIface.encodeFunctionData('setTrust', [trustReceiver, expiry]);
        await sendRunnerTransactionAndWait(runner, {
          to: params.actorAddress,
          value: 0n,
          data,
        }, { label: 'Gateway trust update' });
      })(),
    });
  }
}
