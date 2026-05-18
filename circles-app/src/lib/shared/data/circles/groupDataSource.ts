import type { Sdk } from '@aboutcircles/sdk';
import type {
  Address,
  GroupMembershipRow,
  GroupRow,
  PagedQueryParams,
} from '@aboutcircles/sdk-types';
import { PagedQuery } from '@aboutcircles/sdk-rpc';

export interface GroupMembersPage {
  results: GroupMembershipRow[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface GroupDataSource {
  getGroupMemberships(member: Address, limit: number): PagedQuery<GroupMembershipRow>;
  /** Single page — for progressive scroll-loading. */
  getGroupMembersPage(
    group: Address,
    cursor: string | null,
    pageSize?: number
  ): Promise<GroupMembersPage>;
  /** Exhaustive fetch — for callers that need the full member set in one shot. */
  getGroupMembers(group: Address, pageSize?: number): Promise<GroupMembershipRow[]>;
  /** Total member count from V_CrcV2.Groups (lets the UI pre-allocate list height). */
  getGroupMemberCount(group: Address): Promise<number | null>;
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

    async getGroupMembersPage(
      group: Address,
      cursor: string | null,
      pageSize = 100
    ): Promise<GroupMembersPage> {
      const page = await sdk.rpc.group.getGroupMembers(group, pageSize, cursor);
      return {
        results: page.results,
        hasMore: page.hasMore,
        nextCursor: page.hasMore ? page.nextCursor ?? null : null,
      };
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

    async getGroupMemberCount(group: Address): Promise<number | null> {
      const queryDef: PagedQueryParams = {
        namespace: 'V_CrcV2',
        table: 'Groups',
        columns: ['group', 'memberCount'],
        filter: [
          {
            Type: 'FilterPredicate',
            FilterType: 'Equals',
            Column: 'group',
            Value: group.toLowerCase(),
          },
        ],
        sortOrder: 'DESC',
        limit: 1,
      };
      const query = new PagedQuery<GroupRow>(sdk.rpc.client, queryDef);
      if (!(await query.queryNextPage())) return null;
      const row = query.currentPage?.results?.[0];
      const count = row?.memberCount;
      return typeof count === 'number' ? count : null;
    },
  };
}
