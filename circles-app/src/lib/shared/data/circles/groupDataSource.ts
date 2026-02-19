import type { Sdk } from '@aboutcircles/sdk';
import type { Address } from '@aboutcircles/sdk-types';

export interface GroupDataSource {
  getGroupMemberships(member: Address, limit: number): ReturnType<Sdk['data']['getGroupMemberships']>;
}

export function createGroupDataSource(sdk: Sdk): GroupDataSource {
  return {
    getGroupMemberships(member: Address, limit: number) {
      return sdk.data.getGroupMemberships(member, limit);
    },
  };
}
