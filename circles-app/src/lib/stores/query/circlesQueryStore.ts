import { avatarState } from '$lib/stores/avatar.svelte';
import {
  createEventStore,
  type NextPageData,
} from '$lib/stores/eventStores/eventStoreFactory.svelte';
import {
  type CirclesEventType,
  type CirclesEvent,
  CirclesQuery,
  type EventRow,
} from '@circles-sdk/data';
import { get, type Readable } from 'svelte/store';

/**
 * Generates a unique key for each event row based on the block number, transaction index, and log index.
 *
 * @param {T} tx - The event row for which to generate a key.
 * @returns {string} - A unique string identifier for the event row.
 */
export function getKeyFromItem<T extends EventRow & { address?: string }>(
  tx: T
): string {
  return `${tx.blockNumber}-${tx.transactionIndex}-${tx.logIndex}-${
    tx.address || ''
  }`;
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
  circlesQueryFactory: () => Promise<CirclesQuery<T>>,
  refreshOnEvents?: Set<CirclesEventType>
): Promise<
  Readable<{
    data: T[];
    next: () => Promise<boolean>;
    ended: boolean;
  }>
> {
  const circlesQuery = await circlesQueryFactory();

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
   * If no page is currently loaded, it triggers the query to fetch the first page.
   *
   * @returns {Promise<T[]>} - A promise that resolves to the initial set of event rows.
   */
  async function _initialLoad(): Promise<T[]> {
    const avatarInstance = avatarState.avatar;
    if (!avatarInstance) return [];

    if (!circlesQuery.currentPage?.results) {
      await circlesQuery.queryNextPage();
    }
    return circlesQuery.currentPage?.results || [];
  }

  /**
   * Loads the next page of data from the CirclesQuery and merges it with the current data.
   *
   * @param {T[]} currentData - The current array of event rows.
   * @returns {Promise<NextPageData<T[]>>} - A promise that resolves to the merged data and an indication if there are more pages.
   */
  async function _handleNextPage(currentData: T[]): Promise<NextPageData<T[]>> {
    await circlesQuery?.queryNextPage();
    const mergedData = _mergeData(
      currentData,
      circlesQuery.currentPage?.results || []
    );

    return {
      data: mergedData,
      ended: circlesQuery?.currentPage?.results?.length === 0,
    };
  }

  /**
   * Handles events and refreshes the data by reloading the current page of the CirclesQuery.
   * This function ensures the current data is merged with the new data to prevent duplication.
   *
   * @param {CirclesEvent} event - The event that triggered the refresh.
   * @param {T[]} currentData - The current array of event rows.
   * @returns {Promise<T[]>} - A promise that resolves to the updated data after handling the event.
   */
  async function _handleEvent(
    event: CirclesEvent,
    currentData: T[]
  ): Promise<T[]> {
    const circlesQuery = await circlesQueryFactory();
    if (!circlesQuery.currentPage?.results) {
      await circlesQuery.queryNextPage();
    }
    const updateQuery = circlesQuery.currentPage?.results || [];
    return _mergeData(currentData, updateQuery);
  }

  /**
   * Creates a generic event-driven store that listens for Circles events and fetches data.
   * This store supports infinite scrolling (pagination) and merges new data with existing data.
   */
  return createEventStore<T[]>(
    { avatar: avatarState.avatar },
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
