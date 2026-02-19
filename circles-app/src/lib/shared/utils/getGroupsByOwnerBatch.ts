import type { Address, Filter } from '@aboutcircles/sdk-types';
import type { Sdk } from '@aboutcircles/sdk';
import type { GroupRow, PagedQueryParams } from '@aboutcircles/sdk-types';
import { PagedQuery } from '@aboutcircles/sdk-rpc';

/**
 * Build an OR conjunction of Equals predicates to simulate an IN filter.
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

// export async function getBaseAndCmgGroupsByOwnerBatch(
//   sdk: Sdk,
//   owners: Address[]
// ): Promise<Record<Address, GroupRow[]>> {
//   const acc: Record<Address, GroupRow[]> = {}

//   for (const owner of owners) {
//     const query = sdk.data.findGroups(
//       1000,
//       {
//         ownerEquals: owner.toLowerCase(),
//         groupTypeIn: ['CrcV2_BaseGroupCreated', 'CrcV2_CMGroupCreated']
//       }
//     )

//     const rows: GroupRow[] = []
//     while (await query.queryNextPage()) {
//       rows.push(...(query.currentPage?.results ?? []))
//     }

//     acc[owner] = rows
//   }

//   return acc
// }

export async function getBaseAndCmgGroupsByOwnerBatch(sdk: Sdk, owners: Address[]): Promise<Record<Address, GroupRow[]>> {
  if (owners.length === 0 || !sdk) {
    return {};
  }

  const BaseQueryDefintion: PagedQueryParams = {
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
      buildInFilter('owner', owners.map(o => o.toLowerCase())),
      buildInFilter('type', ['CrcV2_BaseGroupCreated', 'CrcV2_CMGroupCreated']),
    ],
    sortOrder: 'DESC',
    limit: 1000,
  };

  const query = new PagedQuery<GroupRow>(sdk.rpc.client, BaseQueryDefintion);
  const results: GroupRow[] = [];
  const acc: Record<Address, GroupRow[]>= {};

  while (await query.queryNextPage()) {
    const resultRows = query.currentPage?.results ?? [];
    if (resultRows.length === 0) break;
    results.push(...resultRows);
  }

  for (const row of results) {
    const owner = (<any>row).owner.toLowerCase() as Address;
    if (!acc[owner]) {
      acc[owner] = [];
    }
    acc[owner].push(<GroupRow>row);
  }

  return acc;
}