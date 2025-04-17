import type { Address } from '@circles-sdk/utils';
import { CirclesQuery, type GroupRow, type PagedQueryParams } from '@circles-sdk/data';
import type { Sdk } from '@circles-sdk/sdk';

export async function getCmGroupsByOwnerBatch(sdk: Sdk, owners: Address[]): Promise<Record<Address, GroupRow[]>> {
  if (owners.length === 0 || !sdk) {
    return {};
  }

  const queryDefintion: PagedQueryParams = {
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

  const query = new CirclesQuery(sdk.circlesRpc, queryDefintion);
  const results: any[] = [];

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

  return acc;
}