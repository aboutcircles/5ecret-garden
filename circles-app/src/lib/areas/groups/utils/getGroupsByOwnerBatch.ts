import type { Address } from '@aboutcircles/sdk-types';
import type { Sdk } from '@aboutcircles/sdk';
import type { GroupRow } from '@aboutcircles/sdk-types';

/**
 * Get base and CMG groups by owner addresses in batch
 * Uses the new SDK v2 RPC API to query groups with a single aggregated query
 *
 * @param sdk - The new SDK v2 instance
 * @param owners - Array of owner addresses to query groups for
 * @returns Record mapping owner addresses to their groups
 */
export async function getBaseAndCmgGroupsByOwnerBatch(
  sdk: Sdk,
  owners: Address[]
): Promise<Record<Address, GroupRow[]>> {
  if (owners.length === 0 || !sdk) {
    return {};
  }

  // Initialize result with empty arrays for each owner
  const acc: Record<Address, GroupRow[]> = {};
  const normalizedOwners = owners.map((o) => o.toLowerCase() as Address);
  normalizedOwners.forEach((owner) => {
    acc[owner] = [];
  });

  try {
    // New SDK returns PagedResponse<GroupRow> with { results, hasMore, nextCursor }
    // Cast through any due to pnpm sdk-types version split
    const response = await (sdk.rpc as any).group.findGroups(100, {
      ownerIn: normalizedOwners,
      groupTypeIn: ['CrcV2_BaseGroupCreated'],
    }) as { results: GroupRow[]; hasMore: boolean; nextCursor: string | null };

    // Group results by owner
    response.results.forEach((group: GroupRow) => {
      const ownerLower = group.owner?.toLowerCase() as Address;
      if (acc[ownerLower]) {
        acc[ownerLower].push(group);
      }
    });
  } catch (error) {
    console.error(`Failed to fetch groups for owners in batch:`, error);
  }

  return acc;
}
