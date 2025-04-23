import type { Address } from '@circles-sdk/utils';
import type { Sdk } from '@circles-sdk/sdk';
import type { GroupRow } from '@circles-sdk/data';

export async function getBaseAndCmgGroupsByOwnerBatch(
  sdk: Sdk,
  owners: Address[]
): Promise<Record<Address, GroupRow[]>> {
  const acc: Record<Address, GroupRow[]> = {}

  for (const owner of owners) {
    const query = sdk.data.findGroups(
      1000,
      {
        ownerEquals: owner.toLowerCase(),
        groupTypeIn: ['CrcV2_BaseGroupCreated', 'CrcV2_CMGroupCreated']
      }
    )

    const rows: GroupRow[] = []
    while (await query.queryNextPage()) {
      rows.push(...(query.currentPage?.results ?? []))
    }

    acc[owner] = rows
  }

  return acc
}