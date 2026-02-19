import type { Sdk, Avatar } from '@aboutcircles/sdk';
import type { Address, AvatarRow, TokenBalanceRow, TrustRelationRow, AvatarInfo } from '@aboutcircles/sdk-types';
import type { AggregatedTrustRelation } from '@aboutcircles/sdk';

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
 * - sdk.data.getAggregatedTrustRelations() -> sdk.data.getTrustRelations()
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
  // TODO: fix type - new SDK uses sdk.groups.getMembers(groupAddress, limit)
  // This proxy may need rethinking since old SDK queried by member, new SDK queries by group
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

export async function rpcGetProfileByCidBatch<T = unknown>(
  sdk: Sdk,
  cids: string[]
): Promise<T[]> {
  const rpc = await (sdk.rpc as any).call?.('circles_getProfileByCidBatch', [cids]);
  return rpc?.result ?? [];
}

export async function rpcGetCommonTrust(
  sdk: Sdk,
  me: Address,
  other: Address
): Promise<Address[]> {
  const resp = await (sdk.rpc as any).call?.('circles_getCommonTrust', [me, other]);
  return (resp?.result ?? []) as Address[];
}
