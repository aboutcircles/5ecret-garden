import { describe, it, expect } from 'vitest';
import type { Sdk } from '@aboutcircles/sdk';
import type { Address } from '@aboutcircles/sdk-types';
import { loadGroupAffiliateMembers } from '$lib/areas/groups/utils/getGroupAffiliateMembers';
import { RPC_METHOD_NOT_FOUND } from '$lib/shared/data/circles/affiliateGroupQueries';

const GROUP = '0xAaAa000000000000000000000000000000000010' as Address;
const M1 = '0x1111111111111111111111111111111111111111';
const M2 = '0x2222222222222222222222222222222222222222';
const M3 = '0x3333333333333333333333333333333333333333';
const M_UPPER = '0xABCDEF0000000000000000000000000000000002';
const M_LOWER = '0xabcdef0000000000000000000000000000000002';

const WISHLIST = 'circles_getAffiliateGroupMembersWishlist';
const MEMBERS = 'circles_getAffiliateGroupMembers';

/** A single member row in the indexer's wire shape. */
function row(avatarAddress: string, timestamp: number, avatarName: string | null = null) {
  return { avatarName, avatarAddress, timestamp };
}

/** A one-page (no-cursor) response wrapping `rows`. */
function page(rows: ReturnType<typeof row>[]) {
  return { results: rows, hasMore: false, nextCursor: null };
}

/**
 * Stub SDK whose `rpc.client.call` dispatches by method name to the provided
 * response (a value, or a function of params for cursor-aware paging), recording
 * every call.
 */
function mockSdk(
  responses: Record<string, unknown | ((params: unknown[]) => unknown)>
): { sdk: Sdk; calls: Array<{ method: string; params: unknown[] }> } {
  const calls: Array<{ method: string; params: unknown[] }> = [];
  const sdk = {
    rpc: {
      client: {
        call: async (method: string, params: unknown[]) => {
          calls.push({ method, params });
          const r = responses[method];
          if (typeof r === 'function') return (r as (p: unknown[]) => unknown)(params);
          if (r === undefined) throw new Error(`unexpected method ${method}`);
          return r;
        },
      },
    },
  } as unknown as Sdk;
  return { sdk, calls };
}

describe('loadGroupAffiliateMembers', () => {
  it('lowercases the group address in both RPC calls', async () => {
    const { sdk, calls } = mockSdk({ [WISHLIST]: page([]), [MEMBERS]: page([]) });
    await loadGroupAffiliateMembers(sdk, GROUP);
    expect(calls.map((c) => c.method).sort()).toEqual([MEMBERS, WISHLIST].sort());
    for (const c of calls) {
      expect(c.params[0]).toBe(GROUP.toLowerCase());
    }
  });

  it('flags confirmed members and sorts pending-first, newest-first within each', async () => {
    const { sdk } = mockSdk({
      [WISHLIST]: page([row(M1, 1), row(M2, 2), row(M3, 3)]),
      [MEMBERS]: page([row(M2, 2)]),
    });
    const res = await loadGroupAffiliateMembers(sdk, GROUP);
    expect(res.unavailable).toBe(false);
    expect(res.confirmedCount).toBe(1);
    expect(res.pendingCount).toBe(2);
    // pending (M3 then M1, newest first) before confirmed (M2)
    expect(res.members.map((m) => [m.avatarAddress, m.confirmed])).toEqual([
      [M3, false],
      [M1, false],
      [M2, true],
    ]);
  });

  it('matches confirmed status case-insensitively and lowercases addresses', async () => {
    const { sdk } = mockSdk({
      [WISHLIST]: page([row(M_UPPER, 5)]),
      [MEMBERS]: page([row(M_LOWER, 5)]),
    });
    const res = await loadGroupAffiliateMembers(sdk, GROUP);
    expect(res.members[0].avatarAddress).toBe(M_LOWER);
    expect(res.members[0].confirmed).toBe(true);
  });

  it('drains cursor-paginated wishlist pages', async () => {
    const { sdk, calls } = mockSdk({
      [WISHLIST]: (params: unknown[]) => {
        const cursor = params[2];
        if (cursor == null) return { results: [row(M1, 1)], hasMore: true, nextCursor: 'c1' };
        if (cursor === 'c1') return { results: [row(M2, 2)], hasMore: false, nextCursor: null };
        return page([]);
      },
      [MEMBERS]: page([]),
    });
    const res = await loadGroupAffiliateMembers(sdk, GROUP);
    expect(res.members.map((m) => m.avatarAddress).sort()).toEqual([M1, M2].sort());
    const wishlistCursors = calls.filter((c) => c.method === WISHLIST).map((c) => c.params[2]);
    expect(wishlistCursors).toEqual([null, 'c1']);
  });

  it('caps the drain at MAX_PAGES (20) and flags truncated when the cursor never terminates', async () => {
    let n = 0;
    const { sdk } = mockSdk({
      // Always claims another page — the loader must stop itself at the cap.
      [WISHLIST]: () => {
        n += 1;
        const addr = `0x${n.toString(16).padStart(40, '0')}`;
        return { results: [row(addr, n)], hasMore: true, nextCursor: `c${n}` };
      },
      [MEMBERS]: page([]),
    });
    const res = await loadGroupAffiliateMembers(sdk, GROUP);
    expect(res.truncated).toBe(true);
    expect(res.members.length).toBe(20);
  });

  it('returns unavailable=true when the RPC method is not found (-32601)', async () => {
    const err = Object.assign(new Error('Method not found'), { code: RPC_METHOD_NOT_FOUND });
    const { sdk } = mockSdk({
      [WISHLIST]: () => {
        throw err;
      },
      [MEMBERS]: page([]),
    });
    const res = await loadGroupAffiliateMembers(sdk, GROUP);
    expect(res.unavailable).toBe(true);
    expect(res.members).toEqual([]);
  });

  it('propagates errors that are not method-not-found', async () => {
    const { sdk } = mockSdk({
      [WISHLIST]: () => {
        throw new Error('boom');
      },
      [MEMBERS]: page([]),
    });
    await expect(loadGroupAffiliateMembers(sdk, GROUP)).rejects.toThrow('boom');
  });
});
