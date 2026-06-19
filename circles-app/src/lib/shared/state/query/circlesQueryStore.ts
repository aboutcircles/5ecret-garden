import { avatarState } from '$lib/shared/state/avatar.svelte';
import {
  createEventStore,
  type NextPageData,
} from '$lib/shared/state/eventStores/eventStoreFactory.svelte';
import type { CirclesEventType, CirclesEvent } from '@aboutcircles/sdk-rpc';
import type { CirclesQuery, EventRow } from '@aboutcircles/sdk-types';
import type { Avatar } from '@aboutcircles/sdk';
import type { Readable } from 'svelte/store';

/**
 * Generates a unique key for each event row.
 *
 * @param {T} tx - The event row for which to generate a key.
 * @returns {string} - A unique string identifier for the event row.
 */
export function getKeyFromItem<
  T extends EventRow & {
    address?: string;
    id?: string;
    transactionHash?: string;
  },
>(tx: T): string {
  if ('id' in tx && tx.id) {
    return tx.id;
  }
  return `${tx.transactionHash}-${tx.transactionIndex}-${tx.blockNumber}`;
}

/**
 * Creates a Svelte readable store that interacts with a CirclesQuery object.
 * This store handles paginated data fetching and event-based updates.
 * It merges new data with the current data and triggers updates when events occur.
 *
 * @param {CirclesQuery<T>} circlesQueryFactory - The CirclesQuery instance to use for fetching data.
 * @param {Set<CirclesEventType>} [refreshOnEvents] - An optional set of event types that will trigger data refreshes.
 * @returns {Readable<{data: T[], next: () => Promise<boolean>, ended: boolean}>} - A readable store containing the data,
 *          a next function for pagination, and an indicator of whether the data stream has ended.
 */
export async function createCirclesQueryStore<T extends EventRow>(
  avatar: Avatar,
  circlesQueryFactory: () => Promise<CirclesQuery<T>>,
  refreshOnEvents?: Set<CirclesEventType>
): Promise<
  Readable<{
    data: T[];
    next: () => Promise<boolean>;
    ended: boolean;
    initialLoaded: boolean;
    initialLoadError: boolean;
  }>
> {
  let circlesQuery = await circlesQueryFactory();
  // Number of pages currently materialised in the store (initial load = 1; each
  // _handleNextPage advance = +1). _handleEvent uses it to refetch the WHOLE loaded
  // range authoritatively rather than only page 1, so a removal on a scrolled-past
  // page (e.g. a group member untrusted while viewing page 2+) actually disappears.
  let loadedPages = 1;

  /**
   * Compares two rows by value to decide whether a same-key row changed. JSON
   * serialisation is the pragmatic deep-compare here; a non-serialisable row falls
   * back to "changed" so a real correction is never swallowed. Used both by the
   * paginating merge and the authoritative event reconcile below.
   */
  function _rowsEqual(a: T, b: T): boolean {
    if (a === b) return true;
    try {
      // bigint replacer: enriched contact rows can carry bigint fields (avatarInfo), which
      // a bare JSON.stringify would throw on — handle them so equality (and the no-flicker
      // path) still works instead of falling through to "changed" on every event. Wrap in
      // an object (not a string) so a bigint 5n can never serialise equal to a string "5n".
      const replacer = (_k: string, v: unknown) =>
        typeof v === 'bigint' ? { __bigint: v.toString() } : v;
      return JSON.stringify(a, replacer) === JSON.stringify(b, replacer);
    } catch {
      return false;
    }
  }

  /**
   * Additive merge used while paginating FORWARD (_handleNextPage):
   *  - a key not yet present is appended (the next page of results);
   *  - a key already present whose content changed heals the existing row in place
   *    (insurance against a backend that overlaps page boundaries);
   *  - when nothing was appended and nothing healed, the SAME array reference is returned
   *    so the store re-emit is a no-op for keyed lists (no flicker / needless re-render).
   * It never drops a key absent from `newData`, so the merge stays additive — appending a
   * page can't blank already-loaded rows. (Event-driven refreshes use _reconcile instead,
   * which IS authoritative and drops removed rows — see _handleEvent.)
   *
   * @param {T[]} currentData - The current array of event rows.
   * @param {T[]} newData - The new array of event rows to be merged.
   * @returns {T[]} - The merged array (or `currentData` unchanged when nothing changed).
   */
  function _mergeData(currentData: T[], newData: T[]): T[] {
    if (newData.length === 0) return currentData;

    const indexByKey = new Map<string, number>();
    currentData.forEach((tx, i) => indexByKey.set(getKeyFromItem(tx), i));

    const appended: T[] = [];
    const heals = new Map<number, T>();
    for (const tx of newData) {
      const idx = indexByKey.get(getKeyFromItem(tx));
      if (idx === undefined) {
        appended.push(tx);
      } else if (!_rowsEqual(currentData[idx], tx)) {
        heals.set(idx, tx);
      }
    }

    if (appended.length === 0 && heals.size === 0) return currentData;
    const base =
      heals.size > 0 ? currentData.map((row, i) => heals.get(i) ?? row) : currentData;
    return base.concat(appended);
  }

  /**
   * Loads the initial set of data from the CirclesQuery.
   *
   * @returns {Promise<T[]>} - A promise that resolves to the initial set of event rows.
   */
  async function _initialLoad(): Promise<T[]> {
    const avatarInstance = avatarState.avatar;
    if (!avatarInstance) return [];

    return circlesQuery.rows || [];
  }

  /**
   * Loads the next page of data from the CirclesQuery and merges it with the current data.
   *
   * @param {T[]} currentData - The current array of event rows.
   * @returns {Promise<NextPageData<T[]>>} - A promise that resolves to the merged data and an indication if there are more pages.
   */
  async function _handleNextPage(currentData: T[]): Promise<NextPageData<T[]>> {
    if (circlesQuery.hasMore) {
      circlesQuery = await circlesQuery.nextPage();
      loadedPages++;
    }
    const mergedData = _mergeData(
      currentData,
      circlesQuery.rows || []
    );

    return {
      data: mergedData,
      ended: !circlesQuery.hasMore,
    };
  }

  /**
   * Refetches every page the user has already loaded by walking a FRESH, THROWAWAY query
   * forward `loadedPages` times, so the result is authoritative for the entire visible
   * range rather than just page 1.
   *
   * Deliberately does NOT touch the live `circlesQuery`: leaving its cursor in place keeps
   * subsequent scroll-pagination race-free (a concurrent `next()` may already hold it) and
   * is still correct — cursor pagination resumes "after" the same boundary key regardless
   * of membership changes before it, and the loaded range is already reconciled here.
   *
   * @returns {Promise<T[]>} - All rows across the currently-loaded pages, freshly fetched.
   */
  async function _refetchLoadedPages(): Promise<T[]> {
    let q = await circlesQueryFactory();
    let rows = q.rows ? [...q.rows] : [];
    for (let page = 1; page < loadedPages && q.hasMore; page++) {
      q = await q.nextPage();
      if (q.rows) rows = rows.concat(q.rows);
    }
    return rows;
  }

  /**
   * Reconciles the current list against an AUTHORITATIVE refetch of the whole loaded
   * range (unlike the additive _mergeData used while paginating forward):
   *  - a key present before but absent from the refetch is DROPPED — an untrusted group
   *    member on ANY loaded page, or a trailing page emptied by the removal, disappears
   *    live instead of lingering until a full resync;
   *  - a same-key row whose content is unchanged keeps its EXISTING object, so a keyed
   *    list (VirtualList) sees stable row identity — no rebuild / scroll jump;
   *  - a changed row takes the fresh content; a new key is included;
   *  - when the refetch matches the current list exactly, the SAME array reference is
   *    returned so the re-emit is a no-op (no flicker on an unrelated event).
   *
   * Replacing (not merging) is safe here precisely because _handleEvent refetches the
   * FULL loaded range — there is no partial refetch that could blank still-valid rows.
   *
   * @param {T[]} currentData - The current array of event rows.
   * @param {T[]} refreshed - The authoritative rows across all loaded pages.
   * @returns {T[]} - The reconciled array (or `currentData` unchanged when nothing changed).
   */
  function _reconcile(currentData: T[], refreshed: T[]): T[] {
    const byKey = new Map<string, T>();
    for (const row of currentData) byKey.set(getKeyFromItem(row), row);

    let changed = refreshed.length !== currentData.length;
    const result = refreshed.map((row) => {
      const existing = byKey.get(getKeyFromItem(row));
      if (existing && _rowsEqual(existing, row)) return existing;
      changed = true;
      return row;
    });
    return changed ? result : currentData;
  }

  /**
   * Handles events by refetching the full loaded range and reconciling authoritatively,
   * so removals (e.g. an untrusted member on a scrolled-past page) actually disappear,
   * while an unchanged refetch re-emits the same reference (no flicker).
   *
   * @param {CirclesEvent} _event - The event that triggered the refresh (unused, but required by interface).
   * @param {T[]} currentData - The current array of event rows.
   * @returns {Promise<T[]>} - A promise that resolves to the updated data after handling the event.
   */
  async function _handleEvent(
    _event: CirclesEvent,
    currentData: T[]
  ): Promise<T[]> {
    const refreshed = await _refetchLoadedPages();
    return _reconcile(currentData, refreshed);
  }

  /**
   * Creates a generic event-driven store that listens for Circles events and fetches data.
   * This store supports infinite scrolling (pagination) and merges new data with existing data.
   */
  return createEventStore<T[]>(
    avatar,
    refreshOnEvents || new Set(), // Use the provided events or an empty set
    _initialLoad, // Function to load the initial data
    _handleEvent, // Function to handle event-based updates
    _handleNextPage, // Function to handle loading the next page of data
    [], // Initial empty data
    (a, b) => {
      // Comparator to sort the data by blockNumber, transactionIndex, and logIndex
      if (a.blockNumber !== b.blockNumber) {
        return b.blockNumber - a.blockNumber;
      }
      if (a.transactionIndex !== b.transactionIndex) {
        return b.transactionIndex - a.transactionIndex;
      }
      return b.logIndex - a.logIndex;
    }
  );
}
