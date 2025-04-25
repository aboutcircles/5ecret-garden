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

  const CMGQueryDefintion: PagedQueryParams = {
    namespace: 'CrcV2',
    table: 'CMGroupCreated',
    columns: [
      'blockNumber',
      'timestamp',
      'transactionIndex',
      'logIndex',
      'transactionHash',
      'proxy',
      'owner',
      'mintHandler',
      'redemptionHandler',
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
  

  let query = new CirclesQuery(sdk.circlesRpc, CMGQueryDefintion);
  let results: any[] = [];

  while (await query.queryNextPage()) {
    const resultRows = query.currentPage?.results ?? [];
    if (resultRows.length === 0) break;
    results.push(...resultRows);
  }

  //TODO we need this because proxy attribute not exist on GroupRow
  const normalized: (any)[] = results.map(row => ({
    ...row,
    group: row.proxy
  }));

  const acc: Record<Address, GroupRow[]> = {};
  for (const row of normalized) {
    const owner = row.owner.toLowerCase() as Address;
    if (!acc[owner]) {
      acc[owner] = [];
    }
    acc[owner].push(row);
  }

  const BaseQueryDefintion: PagedQueryParams = {
    namespace: 'CrcV2',
    table: 'BaseGroupCreated',
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

  query = new CirclesQuery(sdk.circlesRpc, BaseQueryDefintion);
  results = [];

  while (await query.queryNextPage()) {
    const resultRows = query.currentPage?.results ?? [];
    if (resultRows.length === 0) break;
    results.push(...resultRows);
  }

  for (const row of results) {
    const owner = row.owner.toLowerCase() as Address;
    if (!acc[owner]) {
      acc[owner] = [];
    }
    acc[owner].push(row);
  }

  return acc;
}