import type { Avatar, Sdk } from '@circles-sdk/sdk';
import type { Address } from '@circles-sdk/utils';
import type {
  AvatarRow,
  GroupMembershipRow,
  TokenBalanceRow,
  TrustRelationRow,
} from '@circles-sdk/data';

/**
 * Backward-compatible proxy helpers.
 *
 * Keep these thin and typed. This gives us one central seam where we can add
 * cache / stale-while-revalidate / invalidation later.
 */

export async function dataGetAvatarInfo(
  sdk: Sdk,
  address: Address
): Promise<AvatarRow | undefined> {
  return await sdk.data.getAvatarInfo(address);
}

export async function dataGetAvatarInfoBatch(
  sdk: Sdk,
  addresses: Address[]
): Promise<AvatarRow[]> {
  return await sdk.data.getAvatarInfoBatch(addresses);
}

export async function dataGetAggregatedTrustRelations(
  sdk: Sdk,
  address: Address
): Promise<TrustRelationRow[]> {
  return await sdk.data.getAggregatedTrustRelations(address);
}

export function dataGetGroupMemberships(
  sdk: Sdk,
  member: Address,
  limit: number
) {
  return sdk.data.getGroupMemberships(member, limit);
}

export async function avatarGetBalances(avatar: Avatar): Promise<TokenBalanceRow[]> {
  return await avatar.getBalances();
}

export async function avatarGetTransactionHistory(
  avatar: Avatar,
  pageSize: number
): Promise<ReturnType<Avatar['getTransactionHistory']>> {
  return await avatar.getTransactionHistory(pageSize);
}

export async function rpcGetProfileByCidBatch<T = unknown>(
  sdk: Sdk,
  cids: string[]
): Promise<T[]> {
  const rpc = await sdk.circlesRpc.call<T[]>('circles_getProfileByCidBatch', [cids]);
  return rpc?.result ?? [];
}

export async function rpcGetCommonTrust(
  sdk: Sdk,
  me: Address,
  other: Address
): Promise<Address[]> {
  const resp = await sdk.circlesRpc.call<Address[]>('circles_getCommonTrust', [me, other]);
  return (resp?.result ?? []) as Address[];
}
