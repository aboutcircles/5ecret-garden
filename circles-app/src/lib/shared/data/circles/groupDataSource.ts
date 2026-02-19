import type { Sdk } from '@aboutcircles/sdk';
import type { Address, GroupMembershipRow, PagedQueryParams } from '@aboutcircles/sdk-types';
import { PagedQuery } from '@aboutcircles/sdk-rpc';

export interface GroupDataSource {
  getGroupMemberships(member: Address, limit: number): PagedQuery<GroupMembershipRow>;
}

export function createGroupDataSource(sdk: Sdk): GroupDataSource {
  return {
    getGroupMemberships(member: Address, limit: number): PagedQuery<GroupMembershipRow> {
      const queryDef: PagedQueryParams = {
        namespace: 'V_CrcV2',
        table: 'GroupMemberships',
        columns: ['group', 'member'],
        filter: [
          {
            Type: 'FilterPredicate',
            FilterType: 'Equals',
            Column: 'member',
            Value: member.toLowerCase(),
          },
        ],
        sortOrder: 'DESC',
        limit,
      };
      return new PagedQuery<GroupMembershipRow>(sdk.rpc.client, queryDef);
    },
  };
}
