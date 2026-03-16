import type { TokenBalance } from '@aboutcircles/sdk-types';
import { getAvatarInfoCached } from '$lib/shared/data/circles/avatarDataSource';
import { getGroupName } from '$lib/shared/state/groupNameCache';

/**
 * Determine whether a token balance belongs to a group.
 *
 * The SDK's `isGroup` flag is only `true` for native `CrcV2_RegisterGroup` tokens.
 * ERC20 wrappers of group tokens have `isGroup: false` even though the `tokenOwner`
 * is a group address. This function checks multiple signals:
 *
 * 1. The SDK `isGroup` flag (fast, reliable for native group tokens)
 * 2. Whether the tokenOwner has a native group token in the same balance list
 * 3. Whether the tokenOwner is a known group in the static group name cache
 * 4. Whether the tokenOwner's cached AvatarInfo indicates a group
 */
export function isGroupTokenBalance(
  balance: TokenBalance,
  allBalances?: TokenBalance[],
): boolean {
  // 1. SDK flag — definitive for native group tokens
  if (balance.isGroup) return true;

  const owner = balance.tokenOwner?.toLowerCase();
  if (!owner) return false;

  // 2. Cross-reference: any balance with same owner has isGroup?
  if (allBalances) {
    for (const b of allBalances) {
      if (b.isGroup && b.tokenOwner?.toLowerCase() === owner) return true;
    }
  }

  // 3. Static group name mapping (covers well-known groups)
  if (getGroupName(owner)) return true;

  // 4. Avatar info cache (populated by Avatar component renders)
  const info = getAvatarInfoCached(owner);
  if (info?.type === 'CrcV2_RegisterGroup') return true;

  return false;
}

/**
 * Build a set of known group owner addresses from a balance list.
 * Useful for batch classification without repeated iteration.
 */
export function buildGroupOwnerSet(balances: TokenBalance[]): Set<string> {
  const groupOwners = new Set<string>();
  for (const b of balances) {
    if (b.isGroup) {
      groupOwners.add(b.tokenOwner.toLowerCase());
    }
  }
  // Also add known groups from static cache + avatar info cache
  for (const b of balances) {
    const owner = b.tokenOwner?.toLowerCase();
    if (!owner || groupOwners.has(owner)) continue;
    if (getGroupName(owner)) {
      groupOwners.add(owner);
      continue;
    }
    const info = getAvatarInfoCached(owner);
    if (info?.type === 'CrcV2_RegisterGroup') {
      groupOwners.add(owner);
    }
  }
  return groupOwners;
}
