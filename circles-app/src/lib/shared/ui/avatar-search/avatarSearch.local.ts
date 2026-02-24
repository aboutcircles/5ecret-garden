import { isVipProfileBookmark, type ProfileBookmark } from '$lib/areas/settings/state/profileBookmarks';
import { compareAvatarSearchItems, computeLocalRank, computeTextRank } from './avatarSearch.rank';
import {
  makeBaseAvatarSearchItem,
  matchesAvatarSearchQuery,
  normalizeAvatarSearchAddress,
} from './avatarSearch.merge';
import type { AvatarSearchItem } from './avatarSearch.types';

export function buildLocalAvatarSearchRows(
  contactData: Record<string, any>,
  bookmarks: ProfileBookmark[],
  queryLower: string,
): AvatarSearchItem[] {
  const map = new Map<string, AvatarSearchItem>();

  for (const [addressRaw, contact] of Object.entries(contactData ?? {})) {
    const address = normalizeAvatarSearchAddress(addressRaw);
    if (!address) continue;

    const name = contact?.contactProfile?.name as string | undefined;
    if (!matchesAvatarSearchQuery(address, name, queryLower)) continue;

    const row = makeBaseAvatarSearchItem(address);
    row.name = name;
    row.avatarType = contact?.avatarInfo?.type;
    row.avatarVersion = contact?.avatarInfo?.version;
    row.hasProfile = !!(name && name.trim().length > 0);
    row.isContact = true;
    row.trustRelation = contact?.row?.relation;
    row.localRank = computeLocalRank(row);
    row.remoteRank = computeTextRank(row, queryLower);
    map.set(address, row);
  }

  for (const bookmark of bookmarks ?? []) {
    const address = normalizeAvatarSearchAddress(bookmark?.address);
    if (!address) continue;

    const existing = map.get(address) ?? makeBaseAvatarSearchItem(address);
    if (!matchesAvatarSearchQuery(address, existing.name, queryLower)) continue;

    existing.isBookmarked = true;
    existing.isVipBookmarked = isVipProfileBookmark(bookmark);
    existing.localRank = computeLocalRank(existing);
    existing.remoteRank = computeTextRank(existing, queryLower);
    map.set(address, existing);
  }

  const rows = Array.from(map.values());
  rows.sort((a, b) => compareAvatarSearchItems(a, b, queryLower));
  return rows;
}
