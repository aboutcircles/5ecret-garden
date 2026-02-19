import type { Sdk, Avatar } from '@aboutcircles/sdk';
import type { Address, TokenBalanceRow, AvatarInfo, AggregatedTrustRelation, Profile } from '@aboutcircles/sdk-types';

/**
 * Backward-compatible proxy helpers.
 *
 * Keep these thin and typed. This gives us one central seam where we can add
 * cache / stale-while-revalidate / invalidation later.
 *
 * NOTE: Adapted for @aboutcircles/sdk API surface:
 * - sdk.data.getAvatarInfo() -> sdk.data.getAvatar()
 * - avatar.getBalances() -> avatar.balances.getTokenBalances()
 * - avatar.getTransactionHistory(n) -> avatar.history.getTransactions(n)
 * - sdk.data.getTrustRelations() returns AggregatedTrustRelation[]
 * - sdk.rpc.trust.getCommonTrust() for common trust queries
 * - sdk.rpc.profile.getProfileByCidBatch() for batch profile lookups
 */

export async function dataGetAvatarInfo(
  sdk: Sdk,
  address: Address
): Promise<AvatarInfo | undefined> {
  return await sdk.data.getAvatar(address);
}

export async function dataGetAvatarInfoBatch(
  sdk: Sdk,
  addresses: Address[]
): Promise<(AvatarInfo | undefined)[]> {
  // New SDK doesn't have batch; fallback to sequential calls
  return await Promise.all(addresses.map((a) => sdk.data.getAvatar(a)));
}

export async function dataGetAggregatedTrustRelations(
  sdk: Sdk,
  address: Address
): Promise<AggregatedTrustRelation[]> {
  return await sdk.data.getTrustRelations(address);
}

export function dataGetGroupMemberships(
  sdk: Sdk,
  member: Address,
  limit: number
) {
  // New SDK uses sdk.groups.getMembers(groupAddress, limit) which queries by group, not member.
  // This proxy is kept for backward compat but the caller should migrate to
  // querying group memberships via PagedQuery on the GroupMemberships table.
  return (sdk as any).data?.getGroupMemberships?.(member, limit) ?? Promise.resolve([]);
}

export async function avatarGetBalances(avatar: Avatar): Promise<TokenBalanceRow[]> {
  return await avatar.balances.getTokenBalances();
}

export async function avatarGetTransactionHistory(
  avatar: Avatar,
  pageSize: number
): Promise<any> {
  // TODO: fix type - returns PagedResponse<TransactionHistoryRow> now
  return await avatar.history.getTransactions(pageSize);
}

export async function rpcGetProfileByCidBatch(
  sdk: Sdk,
  cids: string[]
): Promise<(Profile | null)[]> {
  return await sdk.rpc.profile.getProfileByCidBatch(cids);
}

export async function rpcGetCommonTrust(
  sdk: Sdk,
  me: Address,
  other: Address
): Promise<Address[]> {
  return await sdk.rpc.trust.getCommonTrust(me, other);
}
