import type { Sdk, Avatar } from '@aboutcircles/sdk';
import type { Address, AvatarInfo, TokenBalanceRow } from '@aboutcircles/sdk-types';

export interface AvatarDataSource {
  getAvatarInfo(address: Address): Promise<AvatarInfo | undefined>;
  getAvatarInfoBatch(addresses: Address[]): Promise<(AvatarInfo | undefined)[]>;
  getBalances(avatar: Avatar): Promise<TokenBalanceRow[]>;
  getTransactionHistory(
    avatar: Avatar,
    pageSize: number
  ): Promise<any>; // TODO: fix type - PagedResponse<TransactionHistoryRow>
}

export function createAvatarDataSource(sdk: Sdk): AvatarDataSource {
  return {
    async getAvatarInfo(address: Address): Promise<AvatarInfo | undefined> {
      return await sdk.data.getAvatar(address);
    },
    async getAvatarInfoBatch(addresses: Address[]): Promise<(AvatarInfo | undefined)[]> {
      return await Promise.all(addresses.map((a) => sdk.data.getAvatar(a)));
    },
    async getBalances(avatar: Avatar): Promise<TokenBalanceRow[]> {
      return await avatar.balances.getTokenBalances();
    },
    async getTransactionHistory(
      avatar: Avatar,
      pageSize: number
    ): Promise<any> {
      return await avatar.history.getTransactions(pageSize);
    },
  };
}
