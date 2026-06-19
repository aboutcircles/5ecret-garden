import { get } from 'svelte/store';
import type { Address } from '@aboutcircles/sdk-types';
import { circles } from '$lib/shared/state/circles';
import { getActiveConfig } from '$lib/shared/state/settings.svelte';
import { getUnsavedReferrals, markSaved } from './referralLinkStore';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/** Lifecycle of a referral, as reported by the public referrals backend. */
export type ReferralLifecycle =
  | 'pending'
  | 'stale'
  | 'confirmed'
  | 'claimed'
  | 'expired';

/** Subset of the SDK `ReferralInfo` we consume (kept structural to avoid
 * importing the transitive `@aboutcircles/sdk-invitations` package). */
export interface ReferralStatusInfo {
  inviter?: string;
  status?: ReferralLifecycle;
  accountAddress?: string;
  error?: string;
}

/**
 * Whether referral links are deployed on the active network. Chiado and the
 * rings environments carry a zero referrals-module address, so the feature is
 * Gnosis-mainnet only today.
 */
export function referralsAvailable(): boolean {
  const cfg = getActiveConfig();
  return (
    !!cfg.referralsServiceUrl &&
    !!cfg.referralsModuleAddress &&
    cfg.referralsModuleAddress.toLowerCase() !== ZERO_ADDRESS
  );
}

function requireSdk() {
  const sdk = get(circles);
  if (!sdk) throw new Error('Circles SDK not initialised');
  return sdk;
}

/**
 * Persist a referral key to the referrals backend via the SDK's referrals
 * client. `getReferralCode()` does NOT do this itself, and a link only resolves
 * on the claim wallet once its key is stored — so this runs after the on-chain
 * creation transaction (the backend validates the account exists on-chain).
 */
export async function saveReferral(
  inviter: Address,
  privateKey: `0x${string}`,
): Promise<void> {
  await requireSdk().referrals.store(privateKey, inviter);
}

/** Public status lookup for one referral key (no auth). */
export async function getReferralStatus(
  privateKey: string,
): Promise<ReferralStatusInfo> {
  return requireSdk().referrals.retrieve(privateKey);
}

/**
 * Best-effort: re-save any locally-created keys that never reached the backend
 * (created offline, or before the on-chain account was indexed). Recovers dead
 * links on the next dashboard load.
 */
export async function retryUnsavedReferrals(inviter: Address): Promise<void> {
  for (const r of getUnsavedReferrals(inviter)) {
    try {
      await saveReferral(inviter, r.privateKey);
      markSaved(inviter, r.privateKey);
    } catch (e) {
      console.debug('[invites] retry save failed (will retry later)', e);
    }
  }
}
