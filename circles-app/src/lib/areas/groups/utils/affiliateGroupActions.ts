import { get } from 'svelte/store';
import { JsonRpcProvider } from 'ethers';
import type { Address } from '@aboutcircles/sdk-types';

import { circles } from '$lib/shared/state/circles';
import { wallet } from '$lib/shared/state/wallet.svelte';
import { avatarState } from '$lib/shared/state/avatar.svelte';
import { runTask } from '$lib/shared/utils/tasks';
import { shortenAddress } from '$lib/shared/utils/shared';
import { sendRunnerTransactionAndWait } from '$lib/shared/utils/tx';
import { getActiveConfig } from '$lib/shared/state/settings.svelte';
import {
  getAffiliateGroupFeesPercentage,
  isMethodNotFound,
} from '$lib/shared/data/circles/affiliateGroupQueries';
import {
  affiliateRegistryInterface,
  encodeAffiliateGroupCall,
} from '$lib/areas/groups/utils/affiliateGroupCalldata';

/** The configured registry address (lowercased), or null when not on a supported network. */
export function affiliateRegistryAddress(): Address | null {
  const addr = getActiveConfig().multiAffiliateGroupRegistry;
  return addr ? (addr.toLowerCase() as Address) : null;
}

/** Whether community join/leave is wired for the active network (Gnosis mainnet). */
export function isAffiliateRegistryAvailable(): boolean {
  return affiliateRegistryAddress() !== null;
}

function runnerAddress(): Address | null {
  const r = get(wallet) as { address?: string } | null;
  return r?.address ? (r.address.toLowerCase() as Address) : null;
}

function getRpcProvider(): JsonRpcProvider | null {
  const config = getActiveConfig();
  const rpcUrl = config.chainRpcUrl ?? config.circlesRpcUrl;
  return rpcUrl ? new JsonRpcProvider(rpcUrl) : null;
}

// Translate a registry revert into a user-facing message, decoding the custom
// errors where possible. Returns null when the data doesn't decode as one of them.
function describeRegistryRevert(error: unknown): string | null {
  const candidates: unknown[] = [
    (error as { data?: unknown })?.data,
    (error as { info?: { error?: { data?: unknown } } })?.info?.error?.data,
    (error as { error?: { data?: unknown } })?.error?.data,
    (error as { cause?: { data?: unknown } })?.cause?.data,
    (error as { cause?: { info?: { error?: { data?: unknown } } } })?.cause?.info?.error?.data,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && /^0x[0-9a-fA-F]{8,}$/.test(c)) {
      try {
        const parsed = affiliateRegistryInterface.parseError(c);
        if (parsed?.name === 'OnlyHuman') {
          return 'Only human avatars can join communities. Switch to a person avatar and try again.';
        }
        if (parsed?.name === 'AffiliateGroupNotExist') {
          return 'That address is not a registered Circles group (or is not in your communities).';
        }
        if (parsed) return parsed.name;
      } catch {
        // not a registry error — fall through to the next candidate
      }
    }
  }
  return null;
}

// Best-effort preflight so we surface a clear reason instead of an opaque
// execTransaction revert. Skipped silently if no provider is configured.
async function preflight(from: Address, to: Address, data: string): Promise<string | null> {
  const provider = getRpcProvider();
  if (!provider) return null;
  try {
    await provider.call({ from, to, data });
    return null;
  } catch (error) {
    return (
      describeRegistryRevert(error) ??
      (error instanceof Error ? error.message : 'execution reverted')
    );
  }
}

async function sendRegistryTx(
  method: 'addAffiliateGroup' | 'removeAffiliateGroup',
  group: Address,
  taskName: string,
  label: string
): Promise<void> {
  const registry = affiliateRegistryAddress();
  if (!registry) throw new Error('Communities are not available on this network.');

  const runner = get(wallet);
  if (!runner?.sendTransaction) throw new Error('Wallet not connected.');

  const from = runnerAddress();
  if (!from) throw new Error('Wallet runner has no address — reconnect and try again.');

  const data = encodeAffiliateGroupCall(method, group);

  const reason = await preflight(from, registry, data);
  if (reason) throw new Error(reason);

  await runTask({
    name: taskName,
    promise: sendRunnerTransactionAndWait(runner, { to: registry, value: 0n, data }, { label }),
  });
}

/**
 * Signal on-chain intent to join `group` as a community (`addAffiliateGroup`).
 * Idempotent on-chain (a no-op if already joined). Refuses early if the avatar is
 * already at the 100% fee cap — best-effort: the guard is skipped when the read
 * RPC doesn't expose the affiliate methods (e.g. the production server).
 */
export async function joinCommunity(group: Address): Promise<void> {
  const target = group.toLowerCase() as Address;
  const me = avatarState.avatar?.address?.toLowerCase() as Address | undefined;

  // Best-effort cap guard: refuse if already committed to the full 100%.
  const sdk = get(circles);
  if (sdk && me) {
    let committed: number | null = null;
    try {
      committed = await getAffiliateGroupFeesPercentage(sdk.rpc, me);
    } catch (e) {
      if (!isMethodNotFound(e)) throw e;
      committed = null; // unreadable on this server → skip the guard
    }
    if (committed != null && committed >= 100) {
      throw new Error(
        'You are already committed to the 100% membership-fee cap. Leave a community before joining another.'
      );
    }
  }

  await sendRegistryTx(
    'addAffiliateGroup',
    target,
    `Joining community ${shortenAddress(target)} …`,
    'Join community'
  );
}

/** Withdraw intent to join `group` (`removeAffiliateGroup`). */
export async function leaveCommunity(group: Address): Promise<void> {
  const target = group.toLowerCase() as Address;
  await sendRegistryTx(
    'removeAffiliateGroup',
    target,
    `Leaving community ${shortenAddress(target)} …`,
    'Leave community'
  );
}
