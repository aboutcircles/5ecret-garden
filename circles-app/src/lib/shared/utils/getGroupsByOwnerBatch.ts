import type { Address } from '@aboutcircles/sdk-types';
import type { Sdk } from '@aboutcircles/sdk';
import type { GroupRow } from '@aboutcircles/sdk-types';

/**
 * Fetch groups that the given avatars are MEMBERS of.
 *
 * For each avatar address, queries group memberships via the SDK's native
 * `circles_getGroupMemberships` RPC method.
 *
 * Returns minimal GroupRow objects keyed by lowercase member address.
 * The UI components (Avatar, ConnectCircles) only need the `group` address
 * to render — profile data is fetched separately.
 */
export async function getBaseAndCmgGroupsByOwnerBatch(
  sdk: Sdk,
  avatars: Address[]
): Promise<Record<Address, GroupRow[]>> {
  if (avatars.length === 0 || !sdk) {
    return {};
  }

  const acc: Record<Address, GroupRow[]> = {};

  // Query memberships sequentially to avoid 429 rate limiting on the RPC
  for (const avatar of avatars) {
    const key = avatar.toLowerCase() as Address;
    try {
      const response = await sdk.rpc.group.getGroupMemberships(avatar, 100);
      acc[key] = response.results.map((m) => ({
        group: m.group as Address,
      }) as GroupRow);
    } catch (e) {
      console.warn(`[getGroupsByOwnerBatch] Membership query failed for ${avatar}:`, (e as Error).message);
      acc[key] = [];
    }
  }

  return acc;
}
