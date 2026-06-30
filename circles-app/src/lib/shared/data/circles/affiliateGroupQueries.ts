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

/**
 * One member avatar in a group's affiliate wishlist (signalled intent to join) or
 * confirmed-members list, as returned by the `circles_getAffiliateGroupMembers*`
 * RPC methods. The group-centric counterpart to {@link AffiliateGroupRow}.
 */
export interface AffiliateGroupMemberRow {
  /** Member avatar's profile name, or `null` when it has no profile/name. */
  avatarName: string | null;
  /** The member avatar's address (lowercased by {@link normalizeMembersResponse}). */
  avatarAddress: Address;
  /** Unix seconds of the winning `AffiliateGroupAdded` event. */
  timestamp: number;
}

/** A page of {@link AffiliateGroupMemberRow}s plus the indexer's pagination cursor. */
export interface PagedAffiliateMembers {
  results: AffiliateGroupMemberRow[];
  hasMore: boolean;
  nextCursor: string | null;
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
  // Message fallback only for servers that don't set the JSON-RPC code. Kept
  // narrow to the canonical "method not found" phrasing — generic substrings like
  // "not supported" / "does not exist" would misclassify real failures (bad
  // address, node errors) as "feature unavailable" and hide them.
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /method not found|unknown method/i.test(msg);
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

/**
 * The avatar's total committed membership-fee percentage across its wishlist —
 * the number to check against the 100% cap before signalling a new join.
 */
export async function getAffiliateGroupFeesPercentage(
  circlesRpc: CirclesRpc,
  avatar: Address
): Promise<number> {
  const res: { totalFeePercentage?: number } | null = await circlesRpc.client.call(
    'circles_getAffiliateGroupFeesPercentage',
    [avatar.toLowerCase()]
  );
  return Number(res?.totalFeePercentage ?? 0);
}

/** Lowercase every member row's address so confirmed/pending set comparisons are case-stable. */
function normalizeMembersResponse(
  res: Partial<PagedAffiliateMembers> | null
): PagedAffiliateMembers {
  return {
    results: (res?.results ?? []).map((m) => ({
      avatarName: m.avatarName ?? null,
      avatarAddress: String(m.avatarAddress).toLowerCase() as Address,
      timestamp: Number(m.timestamp ?? 0),
    })),
    hasMore: Boolean(res?.hasMore),
    nextCursor: res?.nextCursor ?? null,
  };
}

/**
 * One page of a group's affiliate **wishlist** — avatars that signalled on-chain
 * intent to join `group` as a community. A superset of the confirmed members:
 * an entry stays "pending" until the group also trusts the avatar back.
 */
export async function getAffiliateGroupMembersWishlist(
  circlesRpc: CirclesRpc,
  group: Address,
  limit = 100,
  cursor: string | null = null
): Promise<PagedAffiliateMembers> {
  const res: Partial<PagedAffiliateMembers> | null = await circlesRpc.client.call(
    'circles_getAffiliateGroupMembersWishlist',
    [group.toLowerCase(), limit, cursor]
  );
  return normalizeMembersResponse(res);
}

/**
 * One page of a group's **confirmed** affiliate members — the wishlist subset the
 * group currently trusts back (the bilateral handshake). Lags the wishlist by the
 * trust-manager delay.
 */
export async function getAffiliateGroupMembers(
  circlesRpc: CirclesRpc,
  group: Address,
  limit = 100,
  cursor: string | null = null
): Promise<PagedAffiliateMembers> {
  const res: Partial<PagedAffiliateMembers> | null = await circlesRpc.client.call(
    'circles_getAffiliateGroupMembers',
    [group.toLowerCase(), limit, cursor]
  );
  return normalizeMembersResponse(res);
}
