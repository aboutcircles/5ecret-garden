import type { Sdk } from '@circles-sdk/sdk';

export interface ProfileDataSource {
  getProfileByCidBatch<T = unknown>(cids: string[]): Promise<T[]>;
}

export function createProfileDataSource(sdk: Sdk): ProfileDataSource {
  return {
    async getProfileByCidBatch<T = unknown>(cids: string[]): Promise<T[]> {
      const rpc = await sdk.circlesRpc.call<T[]>('circles_getProfileByCidBatch', [cids]);
      return rpc?.result ?? [];
    },
  };
}
