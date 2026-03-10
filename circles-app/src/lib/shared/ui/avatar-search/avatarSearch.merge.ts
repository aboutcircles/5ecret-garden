import { compareAvatarSearchItems, computeLocalRank } from './avatarSearch.rank';
import type { AvatarSearchItem } from './avatarSearch.types';
import { ethers } from 'ethers';

export function normalizeAvatarSearchAddress(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase();
}

export function makeBaseAvatarSearchItem(address: string): AvatarSearchItem {
  return {
    key: address,
    address,
    blockNumber: 0,
    transactionIndex: 0,
    logIndex: 0,
    hasProfile: false,
    isContact: false,
    isBookmarked: false,
    isVipBookmarked: false,
    localRank: 0,
    remoteRank: 0,
  };
}

export function matchesAvatarSearchQuery(address: string, name: string | undefined, query: string): boolean {
  if (!query) return true;
  const addressLc = normalizeAvatarSearchAddress(address);
  const nameLc = String(name ?? '').toLowerCase();
  return addressLc.includes(query) || nameLc.includes(query);
}

export function mergeAvatarSearchRows(local: AvatarSearchItem[], remote: AvatarSearchItem[], query: string): AvatarSearchItem[] {
  const merged = new Map<string, AvatarSearchItem>();

  for (const item of local) {
    merged.set(normalizeAvatarSearchAddress(item.address), { ...item });
  }

  for (const r of remote) {
    const key = normalizeAvatarSearchAddress(r.address);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...r });
      continue;
    }

    const next: AvatarSearchItem = {
      ...existing,
      ...r,
      address: existing.address || r.address,
      name: existing.name || r.name,
      avatarType: existing.avatarType || r.avatarType,
      avatarVersion: existing.avatarVersion ?? r.avatarVersion,
      hasProfile: existing.hasProfile || r.hasProfile,
      isContact: existing.isContact || r.isContact,
      isBookmarked: existing.isBookmarked || r.isBookmarked,
      isVipBookmarked: existing.isVipBookmarked || r.isVipBookmarked,
      trustRelation: existing.trustRelation ?? r.trustRelation,
      localRank: computeLocalRank({
        isContact: existing.isContact || r.isContact,
        isVipBookmarked: existing.isVipBookmarked || r.isVipBookmarked,
        trustRelation: existing.trustRelation ?? r.trustRelation,
      }),
      remoteRank: Math.max(existing.remoteRank ?? 0, r.remoteRank ?? 0),
      key: existing.address || r.address,
    };

    merged.set(key, next);
  }

  const rows = Array.from(merged.values());
  rows.sort((a, b) => compareAvatarSearchItems(a, b, query));
  return rows;
}

export function buildDirectAddressSelectionRows(
  queryTrimmed: string,
  mergedRows: AvatarSearchItem[],
): AvatarSearchItem[] | null {
  if (!ethers.isAddress(queryTrimmed)) return null;

  const normalizedQueryAddress = normalizeAvatarSearchAddress(queryTrimmed);
  const existing = mergedRows.find(
    (row) => normalizeAvatarSearchAddress(row.address) === normalizedQueryAddress,
  );

  return [existing ?? makeBaseAvatarSearchItem(normalizedQueryAddress)];
}
