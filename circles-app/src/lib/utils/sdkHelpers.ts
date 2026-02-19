/**
 * SDK helper utilities for new RPC methods
 * These provide optimized single-call alternatives to multiple RPC calls
 */

import type { Sdk } from '@aboutcircles/sdk';
import type { CirclesRpc } from '@aboutcircles/sdk-rpc';
import type { Address } from '@aboutcircles/sdk-types';
import type {
  ProfileView,
  TrustNetworkSummary,
  AggregatedTrustRelationsResponse,
  AllInvitationsResponse,
  ValidInvitersResponse,
  EnrichedTransaction,
  PagedResponse,
} from '@aboutcircles/sdk-types';

/**
 * Type-safe accessor for SDK's RPC interface.
 * The Sdk class has `rpc: CirclesRpc` but TypeScript's deep type inference
 * through viem's complex types sometimes fails. This accessor provides
 * the typed boundary once, enabling full type safety in all helper functions.
 */
function getRpc(sdk: Sdk): CirclesRpc {
  return sdk.rpc as CirclesRpc;
}

/**
 * Get comprehensive profile view in a single RPC call
 * Replaces: getAvatarInfo + getProfile + getTrustStats + getBalance
 */
export async function getProfileView(
  sdk: Sdk,
  address: Address
): Promise<ProfileView> {
  return getRpc(sdk).sdk.getProfileView(address);
}

/**
 * Get trust network summary with aggregated metrics
 * Server-side aggregation of trust relations with network reach calculation
 */
export async function getTrustNetworkSummary(
  sdk: Sdk,
  address: Address,
  maxDepth: number = 2
): Promise<TrustNetworkSummary> {
  return getRpc(sdk).sdk.getTrustNetworkSummary(address, maxDepth);
}

/**
 * Get enriched trust relations with avatar info already included
 * Returns trust relations categorized as mutual/trusts/trustedBy with avatar details
 */
export async function getAggregatedTrustRelationsEnriched(
  sdk: Sdk,
  address: Address
): Promise<AggregatedTrustRelationsResponse> {
  // Add timeout to prevent hanging - RPC calls should complete within 15s
  const timeoutMs = 15000;
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`SDK call timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([
      getRpc(sdk).trust.getAggregatedTrustRelationsEnriched(address),
      timeoutPromise
    ]);
  } catch (error) {
    console.error('[SDK] getAggregatedTrustRelationsEnriched FAILED:', error);
    throw error;
  }
}

/**
 * Get all invitations from all sources in a single call
 * Combines: trust-based, escrow-based, and at-scale invitations
 */
export async function getAllInvitations(
  sdk: Sdk,
  address: Address,
  minimumBalance?: string
): Promise<AllInvitationsResponse> {
  return getRpc(sdk).invitation.getAllInvitations(address, minimumBalance);
}

/**
 * Get valid inviters (addresses that trust you AND have sufficient balance)
 */
export async function getValidInviters(
  sdk: Sdk,
  address: Address,
  minimumBalance?: string
): Promise<ValidInvitersResponse> {
  return getRpc(sdk).trust.getValidInviters(address, minimumBalance);
}

/**
 * Get transaction history with participant profiles already enriched
 * Single call instead of fetching transactions + profiles separately
 */
export async function getTransactionHistoryEnriched(
  sdk: Sdk,
  address: Address,
  fromBlock: number = 0,
  toBlock: number | null = null,
  limit: number = 25,
  cursor?: string | null
): Promise<PagedResponse<EnrichedTransaction>> {
  // Add timeout to prevent hanging - RPC calls should complete within 15s
  const timeoutMs = 15000;
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`SDK getTransactionHistoryEnriched timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    console.log('[SDK] getTransactionHistoryEnriched calling RPC...', { address, cursor });
    const result = await Promise.race([
      getRpc(sdk).sdk.getTransactionHistoryEnriched(
        address,
        fromBlock,
        toBlock,
        limit,
        cursor
      ),
      timeoutPromise
    ]);
    console.log('[SDK] getTransactionHistoryEnriched SUCCESS:', { resultCount: result.results?.length ?? 0 });
    return result;
  } catch (error) {
    console.error('[SDK] getTransactionHistoryEnriched FAILED:', error);
    throw error;
  }
}

/**
 * Calculate maximum transferable amount between two addresses
 * Uses pathfinder to determine the max flow
 */
export async function findMaxFlow(
  sdk: Sdk,
  from: Address,
  to: Address
): Promise<bigint> {
  return getRpc(sdk).pathfinder.findMaxFlow({ from, to });
}

/**
 * Search profile type returned by searchProfiles
 */
export interface ProfileSearchResult {
  address: Address;
  name?: string;
  previewImageUrl?: string;
  avatarType?: string;
}

/**
 * Search profiles by name or address
 * Uses the new SDK's optimized searchByAddressOrName endpoint
 */
export async function searchProfiles(
  sdk: Sdk,
  query: string,
  limit: number = 20,
  offset: number = 0,
  avatarTypes?: string[]
): Promise<ProfileSearchResult[]> {
  const response = await getRpc(sdk).profile.searchByAddressOrName(
    query,
    limit,
    offset,
    avatarTypes
  );
  return response.results as ProfileSearchResult[];
}

/**
 * Get invitation origin for an address
 * Returns how an avatar was invited to Circles (v1_signup, v2_standard, v2_escrow, v2_at_scale)
 *
 * Note: This method may not be available in all SDK versions.
 * Falls back gracefully to null if unavailable.
 */
export interface InvitationOrigin {
  type: 'v1_signup' | 'v2_standard' | 'v2_escrow' | 'v2_at_scale';
  inviterAddress?: Address;
  proxyInviterAddress?: Address;
}

export async function getInvitationOrigin(
  sdk: Sdk,
  address: Address
): Promise<InvitationOrigin | null> {
  try {
    // Method may not exist in all SDK versions - use dynamic access
    const rpc = getRpc(sdk);
    const sdkMethods = rpc.sdk as { getInvitationOrigin?: (addr: Address) => Promise<InvitationOrigin> };
    if (typeof sdkMethods.getInvitationOrigin === 'function') {
      return await sdkMethods.getInvitationOrigin(address);
    }
    return null;
  } catch {
    return null;
  }
}
