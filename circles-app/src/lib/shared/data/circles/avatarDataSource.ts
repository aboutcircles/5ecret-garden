import type { Sdk } from '@aboutcircles/sdk';
import type { Address, AvatarInfo } from '@aboutcircles/sdk-types';

export interface AvatarDataSource {
  getAvatarInfo(address: Address): Promise<AvatarInfo | undefined>;
  getAvatarInfoBatch(addresses: Address[]): Promise<(AvatarInfo | undefined)[]>;
}

export function createAvatarDataSource(sdk: Sdk): AvatarDataSource {
  return {
    async getAvatarInfo(address: Address): Promise<AvatarInfo | undefined> {
      return await sdk.data.getAvatar(address);
    },
    async getAvatarInfoBatch(addresses: Address[]): Promise<(AvatarInfo | undefined)[]> {
      return await Promise.all(addresses.map((a) => sdk.data.getAvatar(a)));
    },
  };
}
