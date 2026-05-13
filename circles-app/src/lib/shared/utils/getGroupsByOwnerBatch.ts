import type { Address } from '@aboutcircles/sdk-types';
import type { Sdk } from '@aboutcircles/sdk';
import type { GroupRow } from '@aboutcircles/sdk-types';

/**
 * Fetch base and CMG groups OWNED by the given avatars.
 *
 * Queries `V_CrcV2.Groups` via `sdk.rpc.group.getGroups()` filtered by
 * `owner IN avatars`. The SDK's `findGroups()` RPC does not honor `ownerIn`
 * server-side; `getGroups()` runs a `circles_paginated_query` that does.
 *
 * Returns groups keyed by lowercase owner address. Owners with no owned
 * groups map to an empty array.
 */
export async function getBaseAndCmgGroupsByOwnerBatch(
  sdk: Sdk,
  owners: Address[]
): Promise<Record<Address, GroupRow[]>> {
  if (owners.length === 0 || !sdk) {
    return {};
  }

  const normalizedOwners = owners.map((o) => o.toLowerCase() as Address);
  const acc: Record<Address, GroupRow[]> = {};
  for (const owner of normalizedOwners) {
    acc[owner] = [];
  }

  try {
    const query = sdk.rpc.group.getGroups(1000, {
      ownerIn: normalizedOwners,
      groupTypeIn: ['CrcV2_BaseGroupCreated', 'CrcV2_CMGroupCreated'],
    });

    while (await query.queryNextPage()) {
      const rows = query.currentPage?.results ?? [];
      for (const row of rows) {
        const ownerKey = (row.owner ?? '').toLowerCase() as Address;
        if (acc[ownerKey]) {
          acc[ownerKey].push(row);
        }
      }
      if (!query.currentPage?.hasMore) break;
    }
  } catch (e) {
    console.warn(`[getGroupsByOwnerBatch] Query failed:`, (e as Error).message);
  }

  return acc;
}
