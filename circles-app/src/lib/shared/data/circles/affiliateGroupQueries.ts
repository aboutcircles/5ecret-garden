import type { CirclesRpc } from '@aboutcircles/sdk-rpc';
import type { Address } from '@aboutcircles/sdk-types';

/**
 * A single community (affiliate group) an avatar has a relationship with, as
 * returned by the `circles_getAffiliateGroup*` RPC methods. `membershipFee` is a
 * percent in [0,100] of the avatar's daily gCRC mint, or `null` when the group's
 * profile declares no fee.
 */
export interface AffiliateGroupRow {
  groupName: string | null;
  groupAddress: Address;
  membershipFee: number | null;
  timestamp: number;
}

/** Response shape shared by the wishlist (intent) and trusted (confirmed) methods. */
export interface AffiliateGroupListResponse {
  /** Sum of `membershipFee` over `groups`; a `null` fee contributes 0. */
  totalFeePercentage: number;
  groups: AffiliateGroupRow[];
}

/** JSON-RPC "method not found" error code (JSON-RPC 2.0 spec). */
export const RPC_METHOD_NOT_FOUND = -32601;

/**
 * The five `circles_getAffiliateGroup*` methods are currently deployed on the
 * staging indexer only. On a production-server RPC the call rejects with
 * `-32601`; callers treat that as "feature unavailable on this server" rather
 * than a hard error, so the Communities tab can show a hint instead of failing.
 */
export function isMethodNotFound(err: unknown): boolean {
  const code = (err as { code?: number } | null)?.code;
  if (code === RPC_METHOD_NOT_FOUND) return true;
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /method not found|not supported|does not exist|unknown method/i.test(msg);
}

function normalizeListResponse(
  res: AffiliateGroupListResponse | null
): AffiliateGroupListResponse {
  return {
    totalFeePercentage: Number(res?.totalFeePercentage ?? 0),
    groups: (res?.groups ?? []).map((g) => ({
      groupName: g.groupName ?? null,
      groupAddress: String(g.groupAddress).toLowerCase() as Address,
      membershipFee: g.membershipFee == null ? null : Number(g.membershipFee),
      timestamp: Number(g.timestamp ?? 0),
    })),
  };
}

/** Communities an avatar has signalled on-chain intent to join (the wishlist). */
export async function getAffiliateGroupWishlist(
  circlesRpc: CirclesRpc,
  avatar: Address
): Promise<AffiliateGroupListResponse> {
  const res: AffiliateGroupListResponse = await circlesRpc.client.call(
    'circles_getAffiliateGroupWishlist',
    [avatar.toLowerCase()]
  );
  return normalizeListResponse(res);
}

/**
 * The confirmed-membership subset: groups that currently trust the avatar
 * on-chain (the bilateral handshake). Always a subset of the wishlist, and lags
 * it by the trust-manager delay.
 */
export async function getAffiliateGroups(
  circlesRpc: CirclesRpc,
  avatar: Address
): Promise<AffiliateGroupListResponse> {
  const res: AffiliateGroupListResponse = await circlesRpc.client.call(
    'circles_getAffiliateGroups',
    [avatar.toLowerCase()]
  );
  return normalizeListResponse(res);
}
