import type { Sdk } from '@aboutcircles/sdk';
import type { Address, GroupMembershipRow, PagedQueryParams } from '@aboutcircles/sdk-types';
import { PagedQuery } from '@aboutcircles/sdk-rpc';

export interface GroupDataSource {
  getGroupMemberships(member: Address, limit: number): PagedQuery<GroupMembershipRow>;
  getGroupMembers(group: Address, pageSize?: number): Promise<GroupMembershipRow[]>;
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

    async getGroupMembers(group: Address, pageSize = 100): Promise<GroupMembershipRow[]> {
      const all: GroupMembershipRow[] = [];
      let cursor: string | null = null;
      do {
        const page = await sdk.rpc.group.getGroupMembers(group, pageSize, cursor);
        all.push(...page.results);
        cursor = page.hasMore ? page.nextCursor ?? null : null;
      } while (cursor);
      return all;
    },
  };
}
