import type { Sdk, Avatar } from '@circles-sdk/sdk';
import type { Address } from '@circles-sdk/utils';
import type { AvatarRow, TokenBalanceRow } from '@circles-sdk/data';

export interface AvatarDataSource {
  getAvatarInfo(address: Address): Promise<AvatarRow | undefined>;
  getAvatarInfoBatch(addresses: Address[]): Promise<AvatarRow[]>;
  getBalances(avatar: Avatar): Promise<TokenBalanceRow[]>;
  getTransactionHistory(
    avatar: Avatar,
    pageSize: number
  ): Promise<Awaited<ReturnType<Avatar['getTransactionHistory']>>>;
}

export function createAvatarDataSource(sdk: Sdk): AvatarDataSource {
  return {
    async getAvatarInfo(address: Address): Promise<AvatarRow | undefined> {
      return await sdk.data.getAvatarInfo(address);
    },
    async getAvatarInfoBatch(addresses: Address[]): Promise<AvatarRow[]> {
      return await sdk.data.getAvatarInfoBatch(addresses);
    },
    async getBalances(avatar: Avatar): Promise<TokenBalanceRow[]> {
      return await avatar.getBalances();
    },
    async getTransactionHistory(
      avatar: Avatar,
      pageSize: number
    ): Promise<Awaited<ReturnType<Avatar['getTransactionHistory']>>> {
      return await avatar.getTransactionHistory(pageSize);
    },
  };
}
