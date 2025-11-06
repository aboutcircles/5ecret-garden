import {
  type TransactionHistoryRow,
} from '@circles-sdk/data';
import { writable } from 'svelte/store';
import type { Avatar } from '@circles-sdk/sdk';
import type { PagedQuery } from '@circles-sdk-v2/rpc';

const PAGE_SIZE = 25;

// State for pagination
let currentAvatar: Avatar | null = null;
let isLoading = false;
let pagedQuery: PagedQuery<TransactionHistoryRow> | null = null;

const _transactionHistory = writable<{
  data: TransactionHistoryRow[];
  next: () => Promise<boolean>;
  ended: boolean;
}>({
  data: [],
  next: async () => false,
  ended: false
});

/**
 * Load the next page of transactions using cursor-based pagination
 */
async function loadNextPage(): Promise<boolean> {
  if (!currentAvatar || isLoading || !pagedQuery) {
    return false;
  }

  // Check if there are more pages to load
  if (pagedQuery.currentPage && !pagedQuery.currentPage.hasMore) {
    return false;
  }

  isLoading = true;

  try {
    console.log('🔄 Fetching next page of transaction history...');
    const hasResults = await pagedQuery.queryNextPage();

    if (hasResults && pagedQuery.currentPage) {
      const newData = pagedQuery.currentPage.results;

      _transactionHistory.update(state => ({
        data: [...state.data, ...newData],
        next: loadNextPage,
        ended: !pagedQuery?.currentPage?.hasMore
      }));

      console.log(`✅ Loaded ${newData.length} transactions (hasMore: ${pagedQuery.currentPage.hasMore})`);
      return true;
    } else {
      _transactionHistory.update(state => ({
        ...state,
        ended: true
      }));
      return false;
    }
  } catch (error) {
    console.error('Failed to load transaction history page:', error);
    _transactionHistory.update(state => ({
      ...state,
      ended: true
    }));
    return false;
  } finally {
    isLoading = false;
  }
}

/**
 * Initialize transaction history store for a given avatar
 * Uses the new SDK's cursor-based pagination via avatar.history.getTransactions()
 */
export const initTransactionHistoryStore = async (avatar: Avatar) => {
  // Reset state
  currentAvatar = avatar;
  isLoading = false;

  // Validate avatar is properly initialized
  if (!avatar || typeof avatar !== 'object') {
    console.error('❌ Avatar is not properly initialized:', avatar);
    _transactionHistory.set({
      data: [],
      next: async () => false,
      ended: true,
    });
    return;
  }

  // Validate avatar has history methods
  if (typeof (avatar as any).history?.getTransactions !== 'function') {
    console.error('❌ No history.getTransactions method available on avatar');
    _transactionHistory.set({
      data: [],
      next: async () => false,
      ended: true,
    });
    return;
  }

  // Create a new PagedQuery instance using the avatar's history API
  // avatar.history.getTransactions returns a PagedQuery
  pagedQuery = (avatar as any).history.getTransactions(PAGE_SIZE, 'DESC');

  // Reset store
  _transactionHistory.set({
    data: [],
    next: loadNextPage,
    ended: false,
  });

  // Load initial page
  await loadNextPage();
};

export const transactionHistory = _transactionHistory;
