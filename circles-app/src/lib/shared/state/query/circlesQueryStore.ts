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
   * Merges two arrays of event rows, ensuring no duplicates based on unique keys.
   *
   * @param {T[]} currentData - The current array of event rows.
   * @param {T[]} newData - The new array of event rows to be merged.
   * @returns {T[]} - The merged array of event rows.
   */
  function _mergeData(currentData: T[], newData: T[]): T[] {
    const transactionKeys = new Set(
      currentData.map((tx) => getKeyFromItem(tx))
    );
    return currentData.concat(
      newData.filter((tx) => !transactionKeys.has(getKeyFromItem(tx)))
    );
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
    const merged = _mergeData(currentData, updateQuery);
    // _mergeData only ever appends new-key rows (it never rewrites an existing row), so an
    // unchanged length means nothing was added. Return the same reference in that case so
    // the store re-emit is a no-op for keyed lists — no flicker / needless re-render when
    // no rows were added. (In-place corrections to an already-listed row are not surfaced
    // here either way; that is pre-existing additive-merge behaviour, not changed here.)
    return merged.length === currentData.length ? currentData : merged;
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
