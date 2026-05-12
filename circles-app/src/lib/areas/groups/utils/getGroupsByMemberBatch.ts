import type { Address } from '@circles-sdk/utils';
import type { Sdk } from '@circles-sdk/sdk';
import { CirclesQuery, type GroupRow, type PagedQueryParams } from '@circles-sdk/data';
import type { GroupMembershipRow } from '@circles-sdk/data/dist/rows/groupMembershipRow';
import { createGroupDataSource } from '$lib/shared/data/circles/groupDataSource';

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export async function getGroupsByMember(sdk: Sdk, member: Address): Promise<GroupRow[]> {
  if (!sdk || !member) return [];

  const groupDataSource = createGroupDataSource(sdk);
  const membershipsQuery = groupDataSource.getGroupMemberships(member, 1000);
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
        {
          Type: 'FilterPredicate',
          FilterType: 'In',
          Column: 'group',
          Value: groups.map((g) => g.toLowerCase() as Address),
        },
      ],
      sortOrder: 'DESC',
      limit: 1000,
    };

    const query = new CirclesQuery(sdk.circlesRpc, queryDef);
    while (await query.queryNextPage()) {
      const rows = query.currentPage?.results ?? [];
      if (rows.length === 0) break;
      acc.push(...(rows as GroupRow[]));
    }
  }

  return acc;
}