import type { Sdk } from '@aboutcircles/sdk';
import type { Profile } from '@aboutcircles/sdk-types';

export interface ProfileDataSource {
  getProfileByCidBatch(cids: string[]): Promise<(Profile | null)[]>;
}

export function createProfileDataSource(sdk: Sdk): ProfileDataSource {
  return {
    async getProfileByCidBatch(cids: string[]): Promise<(Profile | null)[]> {
      return await sdk.rpc.profile.getProfileByCidBatch(cids);
    },
  };
}
