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

  /**
   * Compares two rows by value to decide whether a same-key row needs healing. Runs only
   * on a key collision (a re-fetched row already in the list), which for the current
   * consumers is the single full-list contacts snapshot — never the paginated group/member
   * rows, whose keys are distinct. JSON serialisation is the pragmatic deep-compare here;
   * a non-serialisable row falls back to "changed" so a real correction is never swallowed.
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
   * Merges new rows into the current list:
   *  - a key not yet present is appended (pagination / a newly-trusted contact);
   *  - a key already present whose content changed heals the existing row in place —
   *    surfacing a correction, and (for the single-snapshot contacts store) letting an
   *    untrust shrink the list live instead of leaving the stale row behind;
   *  - when nothing was appended and nothing healed, the SAME array reference is returned
   *    so the store re-emit is a no-op for keyed lists (no flicker / needless re-render).
   * It never drops a key absent from `newData`, so the merge stays additive — a partial
   * refetch can't blank already-loaded rows.
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
   * Handles events and refreshes the data by reloading the current page of the CirclesQuery.
   * This function ensures the current data is merged with the new data to prevent duplication.
   *
   * @param {CirclesEvent} _event - The event that triggered the refresh (unused, but required by interface).
   * @param {T[]} currentData - The current array of event rows.
   * @returns {Promise<T[]>} - A promise that resolves to the updated data after handling the event.
   */
  async function _handleEvent(
    _event: CirclesEvent,
    currentData: T[]
  ): Promise<T[]> {
    const refreshedQuery = await circlesQueryFactory();
    const updateQuery = refreshedQuery.rows || [];
    // _mergeData appends new-key rows, heals same-key rows whose content changed, and
    // returns the SAME reference when neither happened — so an unchanged refetch is a
    // no-op re-emit (no flicker) while a correction (or an untrust shrinking the single
    // contacts snapshot) now surfaces instead of being silently dropped.
    return _mergeData(currentData, updateQuery);
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
