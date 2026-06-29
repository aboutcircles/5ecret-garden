import { describe, it, expect } from 'vitest';
import type { Sdk } from '@aboutcircles/sdk';
import type { Address } from '@aboutcircles/sdk-types';
import { loadAvatarCommunities } from '$lib/areas/groups/utils/getAvatarCommunities';
import { RPC_METHOD_NOT_FOUND } from '$lib/shared/data/circles/affiliateGroupQueries';

const AVATAR = '0xAAaA000000000000000000000000000000000001' as Address;
const G1 = '0x1111111111111111111111111111111111111111';
const G2 = '0x2222222222222222222222222222222222222222';
const G_MIXED_UPPER = '0xABCDEF0000000000000000000000000000000001';
const G_MIXED_LOWER = '0xabcdef0000000000000000000000000000000001';

/**
 * Stub SDK whose `rpc.client.call` dispatches by method name to the provided
 * response (or throws, if the entry is a function that throws), recording every call.
 */
function mockSdk(
  responses: Record<string, unknown | (() => unknown)>
): { sdk: Sdk; calls: Array<{ method: string; params: unknown }> } {
  const calls: Array<{ method: string; params: unknown }> = [];
  const sdk = {
    rpc: {
      client: {
        call: async (method: string, params: unknown) => {
          calls.push({ method, params });
          const r = responses[method];
          if (typeof r === 'function') return (r as () => unknown)();
          if (r === undefined) throw new Error(`unexpected method ${method}`);
          return r;
        },
      },
    },
  } as unknown as Sdk;
  return { sdk, calls };
}

describe('loadAvatarCommunities', () => {
  it('lowercases the avatar address in both RPC calls', async () => {
    const { sdk, calls } = mockSdk({
      circles_getAffiliateGroupWishlist: { totalFeePercentage: 0, groups: [] },
      circles_getAffiliateGroups: { totalFeePercentage: 0, groups: [] },
    });
    await loadAvatarCommunities(sdk, AVATAR);
    expect(calls.map((c) => c.method).sort()).toEqual([
      'circles_getAffiliateGroupWishlist',
      'circles_getAffiliateGroups',
    ].sort());
    for (const c of calls) {
      expect((c.params as string[])[0]).toBe(AVATAR.toLowerCase());
    }
  });

  it('flags wishlist groups confirmed when present in the trusted set', async () => {
    const { sdk } = mockSdk({
      circles_getAffiliateGroupWishlist: {
        totalFeePercentage: 12,
        groups: [
          { groupName: 'A', groupAddress: G1, membershipFee: 10, timestamp: 1 },
          { groupName: 'B', groupAddress: G2, membershipFee: 2, timestamp: 2 },
        ],
      },
      circles_getAffiliateGroups: {
        totalFeePercentage: 10,
        groups: [{ groupName: 'A', groupAddress: G1, membershipFee: 10, timestamp: 1 }],
      },
    });
    const res = await loadAvatarCommunities(sdk, AVATAR);
    expect(res.unavailable).toBe(false);
    expect(res.totalFeePercentage).toBe(12);
    expect(res.communities.map((c) => [c.groupAddress, c.confirmed])).toEqual([
      [G1, true],
      [G2, false],
    ]);
  });

  it('matches confirmed status case-insensitively and preserves null fees', async () => {
    const { sdk } = mockSdk({
      circles_getAffiliateGroupWishlist: {
        totalFeePercentage: 0,
        groups: [{ groupName: null, groupAddress: G_MIXED_UPPER, membershipFee: null, timestamp: 0 }],
      },
      circles_getAffiliateGroups: {
        totalFeePercentage: 0,
        groups: [{ groupName: null, groupAddress: G_MIXED_LOWER, membershipFee: null, timestamp: 0 }],
      },
    });
    const res = await loadAvatarCommunities(sdk, AVATAR);
    expect(res.communities[0].groupAddress).toBe(G_MIXED_LOWER);
    expect(res.communities[0].confirmed).toBe(true);
    expect(res.communities[0].membershipFee).toBeNull();
  });

  it('returns unavailable=true when the RPC method is not found (-32601)', async () => {
    const err = Object.assign(new Error('Method not found'), { code: RPC_METHOD_NOT_FOUND });
    const { sdk } = mockSdk({
      circles_getAffiliateGroupWishlist: () => {
        throw err;
      },
      circles_getAffiliateGroups: { totalFeePercentage: 0, groups: [] },
    });
    const res = await loadAvatarCommunities(sdk, AVATAR);
    expect(res.unavailable).toBe(true);
    expect(res.communities).toEqual([]);
    expect(res.totalFeePercentage).toBe(0);
  });

  it('propagates errors that are not method-not-found', async () => {
    const { sdk } = mockSdk({
      circles_getAffiliateGroupWishlist: () => {
        throw new Error('boom');
      },
      circles_getAffiliateGroups: { totalFeePercentage: 0, groups: [] },
    });
    await expect(loadAvatarCommunities(sdk, AVATAR)).rejects.toThrow('boom');
  });
});
