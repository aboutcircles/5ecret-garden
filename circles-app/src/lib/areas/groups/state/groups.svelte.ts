import type { EventRow } from '@aboutcircles/sdk-types';
import { writable } from 'svelte/store';
import type { Avatar, Sdk, HumanAvatar } from '@aboutcircles/sdk';
import type { GroupRow } from '@aboutcircles/sdk-types';
import { isHumanAvatar } from '$lib/shared/utils/avatarHelpers';

export const createBaseGroups = async (avatar: Avatar) => {
  let isLoading = false;
  let allGroupsLoaded = false;
  let unsubscribeFromEvents: (() => void) | undefined;

  const store = writable<{
    data: EventRow[];
    next: () => Promise<boolean>;
    ended: boolean;
  }>({ data: [], next: async () => false, ended: false });

  // Load groups with full details
  const loadGroups = async (): Promise<boolean> => {
    if (isLoading || allGroupsLoaded) {
      return false;
    }

    isLoading = true;

    try {
      console.log('[Groups] Fetching group memberships with details...');

      // Use the avatar.group.getGroupMembershipsWithDetails() method
      // which internally handles pagination and enriches with group details
      // Only HumanAvatar has this method, so we use the type guard
      if (isHumanAvatar(avatar)) {
        const humanAvatar = avatar as HumanAvatar;
        // Check if the method exists (it may not be in all SDK versions)
        if (typeof humanAvatar.group?.getGroupMembershipsWithDetails === 'function') {
          const groups = await humanAvatar.group.getGroupMembershipsWithDetails(1000);
          console.log(`[Groups] Loaded ${groups.length} groups with details`);

          store.set({
            data: groups as EventRow[],
            next: async () => false,
            ended: true,
          });

          allGroupsLoaded = true;
          return groups.length > 0;
        }
      }

      // Avatar does not support group memberships or method doesn't exist
      console.warn('Avatar does not support group memberships');
      store.set({
        data: [],
        next: async () => false,
        ended: true,
      });
      allGroupsLoaded = true;
      return false;
    } catch (error) {
      console.error('Failed to load groups:', error);
      store.set({
        data: [],
        next: async () => false,
        ended: true,
      });
      allGroupsLoaded = true;
      return false;
    } finally {
      isLoading = false;
    }
  };

  // Initialize groups from new SDK
  const initGroups = async () => {
    try {
      console.log('[Groups] Initializing group memberships');

      // Reset store
      store.set({
        data: [],
        next: loadGroups,
        ended: false,
      });

      // Load groups
      await loadGroups();
    } catch (error) {
      console.error('Failed to initialize groups:', error);
      store.set({
        data: [],
        next: async () => false,
        ended: true,
      });
    }
  };

  // Initial load
  await initGroups();

  // Subscribe to events for automatic updates
  // Avatar's subscribeToEvents is a public method on CommonAvatar
  if (typeof avatar.subscribeToEvents === 'function') {
    try {
      console.log('[Groups] Subscribing to avatar events...');
      await avatar.subscribeToEvents();
      console.log('[Groups] Avatar events subscription initialized');

      // Validate events subscription method exists before subscribing
      if (!avatar.events || typeof avatar.events.subscribe !== 'function') {
        console.error('[Groups] Avatar.events.subscribe is not available');
        throw new Error('Avatar.events.subscribe is not available');
      }

      // Listen for group membership changes - capture unsubscribe function
      unsubscribeFromEvents = avatar.events.subscribe((event) => {
        try {
          // Reload groups when membership changes
          if (
            event.$event === 'CrcV2_InviteHuman' ||
            event.$event === 'CrcV2_RegisterGroup' ||
            event.$event === 'CrcV2_Trust'
          ) {
            console.log(
              '[Groups] Group membership event detected, reloading groups...',
              event.$event
            );
            initGroups();
          }
        } catch (error) {
          console.error(
            `Groups: Failed to process group membership event ${event?.$event}`,
            error
          );
        }
      });
    } catch (error) {
      console.error('[Groups] Failed to subscribe to events:', error);
    }
  }

  return {
    store,
    unsubscribe: () => {
      console.log('[Groups] Cleaning up event subscription');
      if (unsubscribeFromEvents) {
        unsubscribeFromEvents();
        unsubscribeFromEvents = undefined;
      }
    }
  };
};

export const createAllGroups = async (sdk: Sdk) => {
  let isLoading = false;
  let currentQuery: any = null;

  const store = writable<{
    data: GroupRow[];
    next: () => Promise<boolean>;
    ended: boolean;
  }>({ data: [], next: async () => false, ended: false });

  // Load next batch of groups using paged query
  const loadNextBatch = async (): Promise<boolean> => {
    if (isLoading) {
      return false;
    }

    isLoading = true;

    try {
      console.log('[Groups] Fetching next batch of all groups...');

      // Query next page
      const hasMore = await currentQuery.queryNextPage();

      if (hasMore && currentQuery.currentPage) {
        const newGroups = currentQuery.currentPage.results;
        console.log(`[Groups] Loaded ${newGroups.length} groups`);

        // Append new groups to existing data
        store.update((state) => ({
          data: [...state.data, ...newGroups],
          next: currentQuery.currentPage.hasMore
            ? loadNextBatch
            : async () => false,
          ended: !currentQuery.currentPage.hasMore,
        }));

        return currentQuery.currentPage.hasMore;
      } else {
        // No more data
        store.update((state) => ({
          ...state,
          next: async () => false,
          ended: true,
        }));
        return false;
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
      store.update((state) => ({
        ...state,
        next: async () => false,
        ended: true,
      }));
      return false;
    } finally {
      isLoading = false;
    }
  };

  // Initialize groups from new SDK
  const initGroups = async () => {
    try {
      console.log('[Groups] Initializing all groups query');

      // Create paged query using SDK
      currentQuery = sdk.rpc.group.getGroups(50);

      // Reset store
      store.set({
        data: [],
        next: loadNextBatch,
        ended: false,
      });

      // Load first batch
      await loadNextBatch();
    } catch (error) {
      console.error('Failed to initialize all groups:', error);
      store.set({
        data: [],
        next: async () => false,
        ended: true,
      });
    }
  };

  // Initial load
  await initGroups();

  return store;
};

/**
 * Create a store for searching groups by name.
 * Uses the SDK's findGroups() method with nameStartsWith filter.
 * Supports cursor-based pagination for large result sets.
 */
export const createSearchGroups = async (sdk: Sdk, query: string) => {
  let isLoading = false;
  let currentCursor: string | null = null;
  let hasMoreResults = true;

  const store = writable<{
    data: GroupRow[];
    next: () => Promise<boolean>;
    ended: boolean;
  }>({ data: [], next: async () => false, ended: false });

  // Load next batch of search results
  const loadNextBatch = async (): Promise<boolean> => {
    if (isLoading || !hasMoreResults) {
      return false;
    }

    isLoading = true;

    try {
      console.log('[Groups] Searching groups with query:', query, 'cursor:', currentCursor);

      // Use findGroups with nameStartsWith filter
      const response = await sdk.rpc.group.findGroups(
        50, // pageSize
        { nameStartsWith: query },
        currentCursor
      );

      if (response.results.length > 0) {
        currentCursor = response.nextCursor;
        hasMoreResults = response.hasMore;

        console.log(`[Groups] Found ${response.results.length} groups matching "${query}"`);

        // Append new results
        store.update((state) => ({
          data: [...state.data, ...response.results],
          next: response.hasMore ? loadNextBatch : async () => false,
          ended: !response.hasMore,
        }));

        return response.hasMore;
      } else {
        // No results
        hasMoreResults = false;
        store.update((state) => ({
          ...state,
          next: async () => false,
          ended: true,
        }));
        return false;
      }
    } catch (error) {
      console.error('Group search failed:', error);
      store.update((state) => ({
        ...state,
        next: async () => false,
        ended: true,
      }));
      return false;
    } finally {
      isLoading = false;
    }
  };

  // Initialize store
  store.set({
    data: [],
    next: loadNextBatch,
    ended: false,
  });

  // Load first batch
  await loadNextBatch();

  return store;
};
