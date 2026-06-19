import { describe, it, expect, vi } from 'vitest';

// The store's _initialLoad reads the global avatarState.avatar only to bail when no
// avatar is connected — stub it truthy so the paginated query drives the data.
vi.mock('$lib/shared/state/avatar.svelte', () => ({
  avatarState: { avatar: { address: '0xself' } },
}));

import { createCirclesQueryStore } from '$lib/shared/state/query/circlesQueryStore';
import type { CirclesQuery } from '@aboutcircles/sdk-types';

// One row per page, mirroring the contacts group-member store: blockNumber is the page
// ordinal (the stable per-page key), `members` stands in for that page's enriched slice.
interface PageRow {
  transactionIndex: number;
  logIndex: number;
  blockNumber: number;
  members: string[];
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitFor(pred: () => boolean, timeout = 1500): Promise<void> {
  const startedAt = Date.now();
  while (!pred()) {
    if (Date.now() - startedAt > timeout) throw new Error('waitFor: timed out');
    await delay(10);
  }
}

/**
 * Builds a CirclesQuery factory that cursor-paginates over whatever `getMembers()`
 * currently returns. Each factory call is an independent walk starting at page 1 with a
 * fresh page ordinal — exactly how the real group store restarts pagination on a refetch.
 */
function makePagedFactory(getMembers: () => string[], pageSize = 3) {
  return async (): Promise<CirclesQuery<PageRow>> => {
    let pageIndex = 0;
    let offset = 0;
    const nextPage = async (): Promise<CirclesQuery<PageRow>> => {
      const all = getMembers();
      const slice = all.slice(offset, offset + pageSize);
      if (slice.length === 0) {
        return { rows: [], hasMore: false, nextPage };
      }
      const row: PageRow = {
        transactionIndex: 0,
        logIndex: 0,
        blockNumber: ++pageIndex,
        members: slice,
      };
      offset += pageSize;
      return { rows: [row], hasMore: offset < all.length, nextPage };
    };
    return nextPage();
  };
}

function makeAvatar() {
  let handler: ((e: any) => void) | undefined;
  return {
    avatar: {
      address: '0xgroup',
      events: {
        subscribe: (h: (e: any) => void) => {
          handler = h;
          return () => {
            handler = undefined;
          };
        },
      },
    } as any,
    fire: (eventType: string) => handler?.({ $event: eventType }),
    isSubscribed: () => handler !== undefined,
  };
}

const flatten = (rows: PageRow[]) => rows.flatMap((r) => r.members);

describe('createCirclesQueryStore — event reconcile across loaded pages', () => {
  it('drops a member removed on a scrolled-past page (and the emptied trailing page)', async () => {
    // 7 members, page size 3 -> pages [m0,m1,m2] [m3,m4,m5] [m6] (blocks 1,2,3).
    const members = ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6'];
    const av = makeAvatar();
    const store = await createCirclesQueryStore<PageRow>(
      av.avatar,
      makePagedFactory(() => members),
      new Set(['CrcV2_Trust']) as any
    );

    let last: any;
    const unsub = store.subscribe((v) => (last = v));
    await waitFor(() => last?.initialLoaded === true && av.isSubscribed());

    // Only page 1 loaded so far.
    expect(flatten(last.data)).toEqual(['m0', 'm1', 'm2']);

    // Scroll to the end: load pages 2 and 3.
    await last.next();
    await last.next();
    expect(flatten(last.data).sort()).toEqual([...members].sort());
    expect(last.data.map((r: PageRow) => r.blockNumber).sort()).toEqual([1, 2, 3]);

    // m4 (page 2 — scrolled past) is untrusted. A trust event fires.
    members.splice(members.indexOf('m4'), 1);
    av.fire('CrcV2_Trust');

    // The event-driven refetch covers ALL loaded pages, so m4 disappears live...
    await waitFor(() => !flatten(last.data).includes('m4'));
    expect(flatten(last.data).sort()).toEqual(['m0', 'm1', 'm2', 'm3', 'm5', 'm6']);
    // ...and the now-empty page 3 (block 3) is dropped, not left as a stale row.
    expect(last.data.map((r: PageRow) => r.blockNumber).sort()).toEqual([1, 2]);

    unsub();
  });

  it('returns the same array reference when an event changes nothing (no flicker)', async () => {
    const members = ['m0', 'm1', 'm2', 'm3'];
    const av = makeAvatar();
    let factoryCalls = 0;
    const baseFactory = makePagedFactory(() => members);
    const store = await createCirclesQueryStore<PageRow>(
      av.avatar,
      async () => {
        factoryCalls++;
        return baseFactory();
      },
      new Set(['CrcV2_Trust']) as any
    );

    let last: any;
    const unsub = store.subscribe((v) => (last = v));
    await waitFor(() => last?.initialLoaded === true && av.isSubscribed());
    await last.next(); // load page 2 -> all 4 members

    const callsBeforeEvent = factoryCalls;
    const dataRefBefore = last.data;

    // An event fires but membership is unchanged.
    av.fire('CrcV2_Trust');
    await waitFor(() => factoryCalls > callsBeforeEvent); // refetch ran
    await delay(40); // let reconcile + setData settle

    // The reconcile produced no change -> the same underlying array reference is kept.
    expect(last.data).toBe(dataRefBefore);
    expect(flatten(last.data).sort()).toEqual([...members].sort());

    unsub();
  });

  it('drops an untrusted contact from a single full-list snapshot (non-paginated path)', async () => {
    // One page, hasMore false -> the single block-0 snapshot path used by personal contacts.
    const members = ['c0', 'c1', 'c2'];
    const av = makeAvatar();
    const store = await createCirclesQueryStore<PageRow>(
      av.avatar,
      makePagedFactory(() => members, 100),
      new Set(['CrcV2_Trust']) as any
    );

    let last: any;
    const unsub = store.subscribe((v) => (last = v));
    await waitFor(() => last?.initialLoaded === true && av.isSubscribed());
    expect(flatten(last.data).sort()).toEqual(['c0', 'c1', 'c2']);

    members.splice(members.indexOf('c1'), 1);
    av.fire('CrcV2_Trust');

    await waitFor(() => !flatten(last.data).includes('c1'));
    expect(flatten(last.data).sort()).toEqual(['c0', 'c2']);

    unsub();
  });
});
