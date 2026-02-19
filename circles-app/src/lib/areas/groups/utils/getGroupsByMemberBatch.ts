import type { Address, Filter } from '@aboutcircles/sdk-types';
import type { Sdk } from '@aboutcircles/sdk';
import type { GroupRow, GroupMembershipRow, PagedQueryParams } from '@aboutcircles/sdk-types';
import { PagedQuery } from '@aboutcircles/sdk-rpc';

/**
 * Build an OR conjunction of Equals predicates to simulate an IN filter.
 * The new SDK FilterType does not support 'In'; use Conjunction instead.
 */
function buildInFilter(column: string, values: string[]): Filter {
  if (values.length === 1) {
    return { Type: 'FilterPredicate', FilterType: 'Equals', Column: column, Value: values[0] };
  }
  return {
    Type: 'Conjunction',
    ConjunctionType: 'Or',
    Predicates: values.map((v) => ({
      Type: 'FilterPredicate' as const,
      FilterType: 'Equals' as const,
      Column: column,
      Value: v,
    })),
  };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export async function getGroupsByMember(sdk: Sdk, member: Address): Promise<GroupRow[]> {
  if (!sdk || !member) return [];

  // Query GroupMemberships table for this member using PagedQuery
  const membershipsQueryDef: PagedQueryParams = {
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
    limit: 1000,
  };

  const membershipsQuery = new PagedQuery<GroupMembershipRow>(sdk.rpc.client, membershipsQueryDef);
  const memberships: GroupMembershipRow[] = [];

  while (await membershipsQuery.queryNextPage()) {
    const rows = membershipsQuery.currentPage?.results ?? [];
    if (rows.length === 0) break;
    memberships.push(...rows);
  }

  const groupAddresses = Array.from(
    new Set(
      memberships
        .map((m) => (m.group ?? '').toLowerCase())
        .filter((g) => g.length > 0)
    )
  ) as Address[];

  if (groupAddresses.length === 0) return [];

  const acc: GroupRow[] = [];
  const groupChunks = chunk(groupAddresses, 200);

  for (const groups of groupChunks) {
    const queryDef: PagedQueryParams = {
      namespace: 'V_CrcV2',
      table: 'Groups',
      columns: [
        'blockNumber',
        'timestamp',
        'transactionIndex',
        'logIndex',
        'transactionHash',
        'group',
        'owner',
      ],
      filter: [
        buildInFilter('group', groups.map((g) => g.toLowerCase())),
      ],
      sortOrder: 'DESC',
      limit: 1000,
    };

    const query = new PagedQuery<GroupRow>(sdk.rpc.client, queryDef);
    while (await query.queryNextPage()) {
      const rows = query.currentPage?.results ?? [];
      if (rows.length === 0) break;
      acc.push(...rows);
    }
  }

  return acc;
}