import type { Address } from '@aboutcircles/sdk-types';
import type { Sdk } from '@aboutcircles/sdk';
import type { GroupRow as NewGroupRow } from '@aboutcircles/sdk-types';
import type { GroupRow as OldGroupRow } from '@aboutcircles/sdk-types';

/**
 * Get base and CMG groups by owner addresses in batch
 * Uses the new SDK v2 RPC API to query groups with a single aggregated query
 *
 * @param sdk - The new SDK v2 instance
 * @param owners - Array of owner addresses to query groups for
 * @returns Record mapping owner addresses to their groups (in old SDK format for compatibility)
 */
export async function getBaseAndCmgGroupsByOwnerBatch(
  sdk: Sdk,
  owners: Address[]
): Promise<Record<Address, OldGroupRow[]>> {
  if (owners.length === 0 || !sdk) {
    return {};
  }

  // Initialize result with empty arrays for each owner
  const acc: Record<Address, OldGroupRow[]> = {};
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
    }) as { results: NewGroupRow[]; hasMore: boolean; nextCursor: string | null };

    // Group results by owner - access the results array from PagedResponse
    response.results.forEach((group: NewGroupRow) => {
      const ownerLower = group.owner?.toLowerCase() as Address;
      if (acc[ownerLower]) {
        // Map new SDK GroupRow to old SDK GroupRow format
        // @todo switch to the new format
        const mappedGroup: OldGroupRow = {
          ...group,
          type: group.type as 'Standard',
          name: group.name || '',
          symbol: group.symbol || '',
          cidV0Digest: group.cidV0Digest || '',
          memberCount: group.memberCount || 0,
          mintPolicy: group.mintPolicy || undefined,
          treasury: group.treasury || undefined,
        };
        acc[ownerLower].push(mappedGroup);
      }
    });
  } catch (error) {
    console.error(`Failed to fetch groups for owners in batch:`, error);
  }

  return acc;
}
