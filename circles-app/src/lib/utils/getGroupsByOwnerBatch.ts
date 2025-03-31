import type { Address } from '@circles-sdk/utils';
import type { CoreMembersGroupRow } from '@circles-sdk/data/dist/rows/coreMembersGroupRow';
import { CirclesQuery, type PagedQueryParams } from '@circles-sdk/data';
import type { Sdk } from '@circles-sdk/sdk';

export async function getCmGroupsByOwnerBatch(sdk: Sdk, owners: Address[]): Promise<Record<Address, CoreMembersGroupRow[]>> {
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

  const acc: Record<Address, CoreMembersGroupRow[]> = {};
  for (const row of results) {
    const owner = row.owner.toLowerCase() as Address;
    if (!acc[owner]) {
      acc[owner] = [];
    }
    acc[owner].push(row);
  }

  return acc;
}