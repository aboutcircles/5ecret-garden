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

export async function dataGetAggregatedTrustRelations(
  sdk: Sdk,
  address: Address
): Promise<AggregatedTrustRelation[]> {
  return await sdk.data.getTrustRelations(address);
}

export async function avatarGetBalances(avatar: Avatar): Promise<TokenBalanceRow[]> {
  return await avatar.balances.getTokenBalances();
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
