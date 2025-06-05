import type { Address } from '@circles-sdk/utils';
import type { Sdk } from '@circles-sdk/sdk';
import { CirclesQuery, type GroupRow, type PagedQueryParams } from '@circles-sdk/data';

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
    filter: [{
      Type: 'FilterPredicate',
      FilterType: 'In',
      Column: 'owner',
      Value: owners.map(o => o.toLowerCase() as Address),
    }],
    sortOrder: 'DESC',
    limit: 1000,
  };

  const query = new CirclesQuery(sdk.circlesRpc, BaseQueryDefintion);
  const results = [];
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