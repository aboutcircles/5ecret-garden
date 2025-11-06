import type { Address } from '@circles-sdk/utils';
import type { Sdk } from '@circles-sdk-v2/sdk';
import type { GroupRow as NewGroupRow } from '@circles-sdk-v2/types';
import type { GroupRow as OldGroupRow } from '@circles-sdk/data';

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
  const normalizedOwners = owners.map(o => o.toLowerCase() as Address);
  normalizedOwners.forEach(owner => {
    acc[owner] = [];
  });

  try {
    const allGroups = await sdk.rpc.group.findGroups(100, {
      ownerIn: normalizedOwners,
      groupTypeIn: ['CrcV2_BaseGroupCreated']
    });

    // Group results by owner
    allGroups.forEach((group: NewGroupRow) => {
      const ownerLower = group.owner?.toLowerCase() as Address;
      if (acc[ownerLower]) {
        // Map new SDK GroupRow to old SDK GroupRow format
        // @todo switch to the new format
        const mappedGroup: OldGroupRow = {
          ...group,
          type: group.type as 'CrcV2_BaseGroupCreated',
          name: group.name || '',
          symbol: group.symbol || '',
          cidV0Digest: group.cidV0Digest || '',
          memberCount: group.memberCount || 0,
          mintPolicy: group.mintPolicy || '',
          treasury: group.treasury || '',
        };
        acc[ownerLower].push(mappedGroup);
      }
    });

  } catch (error) {
    console.error(`Failed to fetch groups for owners in batch:`, error);
  }

  return acc;
}