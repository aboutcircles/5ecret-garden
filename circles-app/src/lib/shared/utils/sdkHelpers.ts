/**
 * SDK helper utilities for new RPC methods
 * These provide optimized single-call alternatives to multiple RPC calls
 *
 * NOTE: The SDK packages have a pnpm dependency version split — sdk-rpc
 * references types from a published sdk-types (0.1.5) that lacks the newer
 * rpc-response interfaces (ProfileView, TrustNetworkSummary, etc.).
 * We therefore re-declare thin local aliases and cast through `any` at the
 * boundary to avoid cross-package type incompatibilities.
 */

import type { Sdk } from '@aboutcircles/sdk';
import type { Address, AvatarInfo, Profile } from '@aboutcircles/sdk-types';

// ---------------------------------------------------------------------------
// Local type declarations matching the new SDK's rpc-responses shapes.
// Required because the app's sdk-rpc resolves to an older sdk-types that
// does not export these interfaces.
// ---------------------------------------------------------------------------

export interface TrustStats {
  trustsCount: number;
  trustedByCount: number;
}

export interface ProfileView {
  address: Address;
  avatarInfo?: AvatarInfo;
  profile?: Profile;
  trustStats: TrustStats;
  v1Balance?: string;
  v2Balance?: string;
}

export interface TrustNetworkSummary {
  address: Address;
  directTrustsCount: number;
  directTrustedByCount: number;
  mutualTrustsCount: number;
  mutualTrusts: Address[];
  networkReach: number;
}

export interface TrustRelationInfo {
  address: Address;
  avatarInfo?: AvatarInfo;
  relationType: 'mutual' | 'trusts' | 'trustedBy';
}

export interface AggregatedTrustRelationsResponse {
  address: Address;
  results: TrustRelationInfo[];
}

export interface InviterInfo {
  address: Address;
  balance: string;
  avatarInfo?: AvatarInfo;
}

export interface ValidInvitersResponse {
  address: Address;
  results: InviterInfo[];
  /** Alias for results -- some RPC versions return validInviters instead */
  validInviters: InviterInfo[];
}

export interface ParticipantInfo {
  avatarInfo?: AvatarInfo;
  profile?: Profile | null;
}

export interface EnrichedTransaction {
  blockNumber: number;
  timestamp: number;
  transactionIndex: number;
  logIndex: number;
  transactionHash: string;
  event: Record<string, unknown>;
  participants: Record<string, ParticipantInfo>;
  // Fields that may appear flat in the RPC response (non-standard but used by the app)
  from?: string;
  to?: string;
  fromProfile?: any;
  toProfile?: any;
  circles?: number | string;
  attoCircles?: string;
  crc?: number | string;
  attoCrc?: string;
  staticCircles?: number | string;
  value?: string;
  version?: number;
  id?: string;
  [key: string]: unknown;
}

export interface PagedResponse<T> {
  results: T[];
  hasMore: boolean;
  nextCursor: string | null;
}

export type InvitationSource = 'trust' | 'escrow' | 'atScale';

export interface InvitationInfo {
  source: InvitationSource;
  /** Primary address field -- RPC responses use this */
  address: Address;
  /** Alias kept for backwards compat; some RPC versions use inviterAddress */
  inviterAddress?: Address;
  balance?: string;
}

export type Invitation = InvitationInfo & {
  [key: string]: unknown;
};

export interface AllInvitationsResponse {
  address: Address;
  trustInvitations: any[];
  escrowInvitations: any[];
  atScaleInvitations: any[];
  /** Combined list of all invitations -- may be populated by RPC or constructed by caller */
  all: Invitation[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Type-safe accessor for SDK's RPC interface.
 * Cast through `any` because the Sdk class declares `rpc: CirclesRpc`
 * but the underlying type references are split across two sdk-types versions.
 */
function getRpc(sdk: Sdk): any {
  return sdk.rpc;
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
  return (response.results ?? response) as ProfileSearchResult[];
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
