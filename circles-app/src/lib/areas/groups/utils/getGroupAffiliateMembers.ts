import type { Sdk } from '@aboutcircles/sdk';
import type { Address } from '@aboutcircles/sdk-types';
import {
  getAffiliateGroupMembersWishlist,
  getAffiliateGroupMembers,
  isMethodNotFound,
  type AffiliateGroupMemberRow,
} from '$lib/shared/data/circles/affiliateGroupQueries';

/** A wishlist member, annotated with whether the group has trusted them back. */
export interface GroupAffiliateMember extends AffiliateGroupMemberRow {
  /** true once the group also trusts the avatar on-chain (the bilateral handshake). */
  confirmed: boolean;
}

export interface GroupAffiliateMembers {
  /** Wishlist members (intent), pending first then confirmed, newest first within each. */
  members: GroupAffiliateMember[];
  confirmedCount: number;
  pendingCount: number;
  /**
   * true when the safety page cap was hit, so the lists may be incomplete (and a
   * confirmed member beyond the cap could surface as "pending"). Beta wishlists are
   * far below the cap; the UI surfaces this as a "showing first N" note when set.
   */
  truncated: boolean;
  /**
   * true when the connected RPC doesn't expose the affiliate methods (e.g. the
   * production server before promotion). The UI hides the section rather than error.
   */
  unavailable: boolean;
}

const PAGE_SIZE = 100;
/** Hard cap (PAGE_SIZE × MAX_PAGES = 2000 rows) so a runaway cursor can't loop forever. */
const MAX_PAGES = 20;

const EMPTY: GroupAffiliateMembers = {
  members: [],
  confirmedCount: 0,
  pendingCount: 0,
  truncated: false,
  unavailable: false,
};

/** Drain a cursor-paginated reader up to the safety cap, flagging if it was hit. */
async function loadAllPages(
  fetchPage: (cursor: string | null) => Promise<{
    results: AffiliateGroupMemberRow[];
    hasMore: boolean;
    nextCursor: string | null;
  }>
): Promise<{ rows: AffiliateGroupMemberRow[]; truncated: boolean }> {
  const rows: AffiliateGroupMemberRow[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = await fetchPage(cursor);
    rows.push(...page.results);
    if (!page.hasMore || !page.nextCursor) return { rows, truncated: false };
    cursor = page.nextCursor;
  }
  return { rows, truncated: true };
}

/**
 * Load a group's affiliate wishlist — the avatars that signalled intent to join it
 * as a community — each flagged confirmed (the group also trusts them) or pending.
 *
 * Wishlist = inbound intent. The confirmed set is a subset (the group trusts the
 * avatar back) and lags the wishlist by the trust-manager delay, so a member stays
 * "Pending" until that trust lands. Pending rows are exactly the avatars a group
 * operator (or its TMS) would trust to confirm.
 */
export async function loadGroupAffiliateMembers(
  sdk: Sdk,
  group: Address
): Promise<GroupAffiliateMembers> {
  try {
    const [wishlist, confirmed] = await Promise.all([
      loadAllPages((cursor) => getAffiliateGroupMembersWishlist(sdk.rpc, group, PAGE_SIZE, cursor)),
      loadAllPages((cursor) => getAffiliateGroupMembers(sdk.rpc, group, PAGE_SIZE, cursor)),
    ]);

    const confirmedSet = new Set(confirmed.rows.map((m) => m.avatarAddress));
    const members: GroupAffiliateMember[] = wishlist.rows.map((m) => ({
      ...m,
      confirmed: confirmedSet.has(m.avatarAddress),
    }));

    // Pending first (the operator's action queue), then confirmed; newest first within each.
    members.sort(
      (a, b) => Number(a.confirmed) - Number(b.confirmed) || b.timestamp - a.timestamp
    );

    return {
      members,
      confirmedCount: members.filter((m) => m.confirmed).length,
      pendingCount: members.filter((m) => !m.confirmed).length,
      truncated: wishlist.truncated || confirmed.truncated,
      unavailable: false,
    };
  } catch (err) {
    // The methods are deployed together; if the server lacks them, surface a
    // "not available here" state rather than propagating the error.
    if (isMethodNotFound(err)) {
      return { ...EMPTY, unavailable: true };
    }
    throw err;
  }
}
