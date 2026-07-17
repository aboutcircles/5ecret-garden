import type { Sdk } from '@aboutcircles/sdk';
import type { Address } from '@aboutcircles/sdk-types';
import {
  getAffiliateGroupWishlist,
  getAffiliateGroups,
  isMethodNotFound,
  type AffiliateGroupRow,
} from '$lib/shared/data/circles/affiliateGroupQueries';

/** A wishlist community, annotated with whether the group has confirmed the avatar. */
export interface AvatarCommunity extends AffiliateGroupRow {
  /** true once the group also trusts the avatar on-chain (the bilateral handshake). */
  confirmed: boolean;
}

export interface AvatarCommunities {
  /** Sum of `membershipFee` across the wishlist; gate joins against the 100% cap. */
  totalFeePercentage: number;
  communities: AvatarCommunity[];
  /**
   * true when the connected RPC doesn't expose the affiliate methods (e.g. the
   * production server before promotion). The UI shows an "available on staging"
   * hint instead of an error.
   */
  unavailable: boolean;
}

const EMPTY: AvatarCommunities = {
  totalFeePercentage: 0,
  communities: [],
  unavailable: false,
};

/**
 * Load the communities an avatar has signalled intent to join, each flagged with
 * its confirmed/pending trust status, plus the running total fee percentage.
 *
 * Wishlist = intent (the avatar signalled on-chain). The trusted set is a subset
 * (the group also trusts the avatar) and lags the wishlist by the trust-manager
 * delay, so a community stays "Pending" until that trust lands.
 */
export async function loadAvatarCommunities(
  sdk: Sdk,
  avatar: Address
): Promise<AvatarCommunities> {
  try {
    const [wishlist, trusted] = await Promise.all([
      getAffiliateGroupWishlist(sdk.rpc, avatar),
      getAffiliateGroups(sdk.rpc, avatar),
    ]);

    const confirmedSet = new Set(trusted.communities.map((g) => g.communityAddress));
    const communities: AvatarCommunity[] = wishlist.communities.map((g) => ({
      ...g,
      confirmed: confirmedSet.has(g.communityAddress),
    }));

    return {
      totalFeePercentage: wishlist.totalFeePercentage,
      communities,
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
