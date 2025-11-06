import type { EventRow } from '@circles-sdk/data';
import { writable } from 'svelte/store';
import type { Avatar } from '@circles-sdk/sdk';
import type { Sdk } from '@circles-sdk-v2/sdk';
import type { GroupRow } from '@circles-sdk-v2/types';

export const createBaseGroups = async (avatar: Avatar) => {
  let isLoading = false;
  let allGroupsLoaded = false;

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
      console.log('🔄 Fetching group memberships with details...');

      // Use the avatar.group.getGroupMembershipsWithDetails() method
      // which internally handles pagination and enriches with group details
      const groups = await (avatar as any).group.getGroupMembershipsWithDetails(1000);

      console.log(`✅ Loaded ${groups.length} groups with details`);

      store.set({
        data: groups as EventRow[],
        next: async () => false,
        ended: true
      });

      allGroupsLoaded = true;
      return groups.length > 0;
    } catch (error) {
      console.error('Failed to load groups:', error);
      store.set({
        data: [],
        next: async () => false,
        ended: true
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
      console.log('🔄 Initializing group memberships');

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
  if (typeof (avatar as any).subscribeToEvents === 'function') {
    try {
      await (avatar as any).subscribeToEvents();

      // Listen for group membership changes
      (avatar as any).events.subscribe((event: any) => {
        // Reload groups when membership changes
        if (event.$event === 'CrcV2_InviteHuman' ||
            event.$event === 'CrcV2_RegisterGroup' ||
            event.$event === 'CrcV2_Trust') {
          console.log('🔄 Group membership event detected, reloading groups...', event.$event);
          initGroups();
        }
      });
    } catch (error) {
      console.warn('Failed to subscribe to events:', error);
    }
  }

  return store;
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
      console.log('🔄 Fetching next batch of all groups...');

      // Query next page
      const hasMore = await currentQuery.queryNextPage();

      if (hasMore && currentQuery.currentPage) {
        const newGroups = currentQuery.currentPage.results;
        console.log(`✅ Loaded ${newGroups.length} groups`);

        // Append new groups to existing data
        store.update(state => ({
          data: [...state.data, ...newGroups],
          next: currentQuery.currentPage.hasMore ? loadNextBatch : async () => false,
          ended: !currentQuery.currentPage.hasMore
        }));

        return currentQuery.currentPage.hasMore;
      } else {
        // No more data
        store.update(state => ({
          ...state,
          next: async () => false,
          ended: true
        }));
        return false;
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
      store.update(state => ({
        ...state,
        next: async () => false,
        ended: true
      }));
      return false;
    } finally {
      isLoading = false;
    }
  };

  // Initialize groups from new SDK
  const initGroups = async () => {
    try {
      console.log('🔄 Initializing all groups query');

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
