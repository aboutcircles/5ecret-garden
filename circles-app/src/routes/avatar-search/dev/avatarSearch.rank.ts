import type { AvatarSearchItem, TrustRelationLike } from './avatarSearch.types';

export function computeTextRank(item: { address: string; name?: string }, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const address = String(item.address ?? '').toLowerCase();
  const name = String(item.name ?? '').toLowerCase();

  if (address === q) return 500;
  if (address.startsWith(q)) return 300;
  if (name === q) return 250;
  if (name.startsWith(q)) return 200;
  if (name.includes(q)) return 120;
  if (address.includes(q)) return 100;
  return 0;
}

export function computeLocalRank(flags: {
  isContact: boolean;
  isVipBookmarked?: boolean;
  trustRelation?: TrustRelationLike;
}): number {
  let rank = 0;
  if (flags.isContact) rank += 100;
  if (flags.isVipBookmarked) rank += 100;

  if (flags.trustRelation === 'mutuallyTrusts') rank += 25;
  else if (flags.trustRelation === 'trusts') rank += 20;
  else if (flags.trustRelation === 'variesByVersion') rank += 10;
  else if (flags.trustRelation === 'trustedBy') rank += 0;

  return rank;
}

export function compareAvatarSearchItems(a: AvatarSearchItem, b: AvatarSearchItem, query: string): number {
  const aClose = a.localRank > 0 ? 1 : 0;
  const bClose = b.localRank > 0 ? 1 : 0;
  if (aClose !== bClose) return bClose - aClose;

  if (a.localRank !== b.localRank) return b.localRank - a.localRank;

  const aHasProfile = a.hasProfile ? 1 : 0;
  const bHasProfile = b.hasProfile ? 1 : 0;
  if (aHasProfile !== bHasProfile) return bHasProfile - aHasProfile;

  const aVersionScore = a.avatarVersion === 2 ? 2 : a.avatarVersion === 1 ? 1 : 0;
  const bVersionScore = b.avatarVersion === 2 ? 2 : b.avatarVersion === 1 ? 1 : 0;
  if (aVersionScore !== bVersionScore) return bVersionScore - aVersionScore;

  const aText = computeTextRank(a, query);
  const bText = computeTextRank(b, query);
  if (aText !== bText) return bText - aText;

  const an = (a.name ?? '').toLowerCase();
  const bn = (b.name ?? '').toLowerCase();
  if (an !== bn) return an.localeCompare(bn);

  return a.address.toLowerCase().localeCompare(b.address.toLowerCase());
}
