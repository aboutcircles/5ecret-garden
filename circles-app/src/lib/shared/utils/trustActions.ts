import { get } from 'svelte/store';
import { ethers, JsonRpcProvider } from 'ethers';
import type { Address } from '@aboutcircles/sdk-types';

import { avatarState } from '$lib/shared/state/avatar.svelte';
import { circles } from '$lib/shared/state/circles';
import { wallet } from '$lib/shared/state/wallet.svelte';
import { runTask } from '$lib/shared/utils/tasks';
import { shortenAddress } from '$lib/shared/utils/shared';
import { sendRunnerTransactionAndWait } from '$lib/shared/utils/tx';
import {
  assessManagePermission,
  probeGroupCapabilities,
  type GroupCapabilities,
  type GroupTrustKind,
  type ManagePermission,
} from '$lib/areas/groups/utils/groupKind';
import { buildNestedSafeCalldata } from '$lib/areas/groups/utils/groupOwnerProxy';
import { getActiveConfig } from '$lib/shared/state/settings.svelte';

// 96-bit max — what `BaseGroup.trust(...)` and friends interpret as "no expiry".
const TRUST_EXPIRY_MAX = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFF');

// Selector of `OnlyOwnerOrService()` custom error.
// `cast 4byte 0xf1427430` → OnlyOwnerOrService(). This is what the v2
// BaseGroup family reverts with when msg.sender is neither owner nor service.
// We watch for this byte signature in preflight to know we should attempt
// to nest the call through the group-owner Safe.
const ONLY_OWNER_OR_SERVICE_SELECTOR = '0xf1427430';

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

function getRpcProvider(): JsonRpcProvider | null {
  const config = getActiveConfig();
  const rpcUrl = config.chainRpcUrl ?? config.circlesRpcUrl;
  return rpcUrl ? new JsonRpcProvider(rpcUrl) : null;
}

// Pull a revert selector / reason string out of the various error shapes
// ethers / RPC providers may throw. Returns the lowercased 0x-prefixed
// 4-byte selector if found, else null.
function extractRevertSelector(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const candidates: unknown[] = [
    (error as any).data,
    (error as any).info?.error?.data,
    (error as any).error?.data,
    (error as any).cause?.data,
    (error as any).cause?.info?.error?.data,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && /^0x[0-9a-fA-F]{8,}$/.test(c)) {
      return c.slice(0, 10).toLowerCase();
    }
  }
  return null;
}

// Best-effort decoded revert reason for surfacing to the user. Falls back to
// raw selector or generic message.
function describeRevert(error: unknown): string {
  const sel = extractRevertSelector(error);
  if (sel === ONLY_OWNER_OR_SERVICE_SELECTOR) {
    return 'OnlyOwnerOrService — the group rejected the call from this account';
  }
  const msg = error instanceof Error ? error.message : String(error ?? '');
  if (msg) return msg;
  return sel ? `revert ${sel}` : 'execution reverted';
}

// Preflight: simulate the trust call from the current runner's address. We
// don't *care* about a successful return value — we only need to know whether
// the on-chain modifier would reject this msg.sender, and decide between
// (direct submit) | (nested-Safe route) | (surface clear error).
async function preflightTrustCall(
  from: Address,
  to: Address,
  data: string
): Promise<{ ok: true } | { ok: false; selector: string | null; reason: string }> {
  const provider = getRpcProvider();
  if (!provider) {
    // No RPC available — skip preflight and let the real submit decide.
    return { ok: true };
  }
  try {
    await provider.call({ from, to, data });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      selector: extractRevertSelector(error),
      reason: describeRevert(error),
    };
  }
}

function runnerAddress(): Address | null {
  const r = get(wallet) as { address?: string } | null;
  if (!r?.address) return null;
  return r.address.toLowerCase() as Address;
}

// Single entry point for submitting a group-trust mutation. Builds the
// calldata, preflights it from the connected runner, and either submits
// direct, nests via the group-owner Safe, or surfaces a clear error.
//
// Both addTrustRelations (group branch) and removeGroupMembers funnel through
// here so the same preflight + nesting logic covers add and remove.
async function sendGroupTrustTx(params: {
  groupAddress: Address;
  caps: GroupCapabilities;
  members: Address[];
  expiry: bigint;
  taskName: string;
}): Promise<void> {
  const runner = get(wallet);
  if (!runner?.sendTransaction) {
    throw new Error('Wallet not connected.');
  }

  const innerData = encodeGroupTrustCall(
    params.caps.trustKind,
    params.members,
    params.expiry
  );
  const from = runnerAddress();
  if (!from) {
    throw new Error('Wallet runner has no address — reconnect and try again.');
  }

  const preflight = await preflightTrustCall(
    from,
    params.groupAddress,
    innerData
  );

  if (preflight.ok) {
    await runTask({
      name: params.taskName,
      promise: sendRunnerTransactionAndWait(
        runner,
        { to: params.groupAddress, value: 0n, data: innerData },
        { label: 'Group trust update' }
      ),
    });
    return;
  }

  // Preflight says the call won't succeed as msg.sender = currentRunner.
  // If it's specifically the "only owner / service" rejection AND the runner
  // is a co-signer of the group-owner Safe, nest the call through the owner
  // Safe and retry from there.
  const perm = assessManagePermission(params.caps, from);
  const isOwnerCheckFailure =
    preflight.selector === ONLY_OWNER_OR_SERVICE_SELECTOR;

  if (
    isOwnerCheckFailure &&
    perm.canManage &&
    perm.reason === 'nested-safe' &&
    perm.ownerProxyChain.length === 1
  ) {
    const ownerSafe = perm.ownerProxyChain[0];
    const nestedCalldata = buildNestedSafeCalldata({
      innerTo: params.groupAddress,
      innerData,
      runnerSafeAddress: from,
    });
    await runTask({
      name: params.taskName,
      promise: sendRunnerTransactionAndWait(
        runner,
        { to: ownerSafe, value: 0n, data: nestedCalldata },
        { label: 'Group trust update (routed via owner Safe)' }
      ),
    });
    return;
  }

  // Preflight failed and we can't route. Surface a meaningful, address-bearing
  // error instead of letting the user hit the opaque execTransaction revert.
  if (isOwnerCheckFailure) {
    const ownerHint = params.caps.owner
      ? ` Manage this group from the Safe that owns it (${shortenAddress(params.caps.owner)}).`
      : '';
    throw new Error(
      `You don't have permission to update trust on this group from ${shortenAddress(from)}.${ownerHint}`
    );
  }
  throw new Error(`Group trust call would revert: ${preflight.reason}`);
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
    caps,
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
    if (caps.trustKind === 'unknown') {
      // No recognizable trust selector at all — refuse fast instead of
      // submitting calldata to a contract that won't dispatch it.
      throw new Error(
        'Unsupported group contract type at ' +
          params.actorAddress +
          '. Could not detect a known trustBatch* selector in its bytecode.'
      );
    }

    await sendGroupTrustTx({
      groupAddress: params.actorAddress,
      caps,
      members: trustTargets,
      expiry: TRUST_EXPIRY_MAX,
      taskName: `${shortenAddress(params.actorAddress)} trusts ${trustTargets.length} avatar${trustTargets.length === 1 ? '' : 's'} ...`,
    });
    return;
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

// Re-export so UI components can derive permission state without importing
// from groupKind directly (smaller import surface).
export { assessManagePermission };
export type { ManagePermission };
