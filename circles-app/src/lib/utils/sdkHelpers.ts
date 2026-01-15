/**
 * SDK helper utilities for new RPC methods
 * These provide optimized single-call alternatives to multiple RPC calls
 */

import type { Sdk } from '@aboutcircles/sdk';
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
 * Get comprehensive profile view in a single RPC call
 * Replaces: getAvatarInfo + getProfile + getTrustStats + getBalance
 */
export async function getProfileView(
  sdk: Sdk,
  address: Address
): Promise<ProfileView> {
  return (sdk as any).rpc.sdk.getProfileView(address);
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
  return (sdk as any).rpc.sdk.getTrustNetworkSummary(address, maxDepth);
}

/**
 * Get enriched trust relations with avatar info already included
 * Returns trust relations categorized as mutual/trusts/trustedBy with avatar details
 */
export async function getAggregatedTrustRelationsEnriched(
  sdk: Sdk,
  address: Address
): Promise<AggregatedTrustRelationsResponse> {
  return (sdk as any).rpc.trust.getAggregatedTrustRelationsEnriched(address);
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
  return (sdk as any).rpc.invitation.getAllInvitations(address, minimumBalance);
}

/**
 * Get valid inviters (addresses that trust you AND have sufficient balance)
 */
export async function getValidInviters(
  sdk: Sdk,
  address: Address,
  minimumBalance?: string
): Promise<ValidInvitersResponse> {
  return (sdk as any).rpc.trust.getValidInviters(address, minimumBalance);
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
  return (sdk as any).rpc.sdk.getTransactionHistoryEnriched(
    address,
    fromBlock,
    toBlock,
    limit,
    cursor
  );
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
  return (sdk as any).rpc.pathfinder.findMaxFlow({ from, to });
}
