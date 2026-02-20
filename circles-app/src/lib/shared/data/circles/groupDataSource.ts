import type { Sdk } from '@circles-sdk/sdk';
import type { Address } from '@circles-sdk/utils';

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
