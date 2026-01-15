import type { TransactionHistoryRow } from '@aboutcircles/sdk-rpc';
import { writable } from 'svelte/store';
import type { Avatar } from '@aboutcircles/sdk';
import type { PagedResponse } from '@aboutcircles/sdk-types';

const PAGE_SIZE = 25;

// State for cursor-based pagination
let currentAvatar: Avatar | null = null;
let isLoading = false;
let nextCursor: string | null = null;
let hasMore = true;

const _transactionHistory = writable<{
  data: TransactionHistoryRow[];
  next: () => Promise<boolean>;
  ended: boolean;
}>({
  data: [],
  next: async () => false,
  ended: false,
});

/**
 * Load the next page of transactions using cursor-based pagination
 * New SDK returns PagedResponse with { results, hasMore, nextCursor }
 */
async function loadNextPage(): Promise<boolean> {
  if (!currentAvatar || isLoading || !hasMore) {
    return false;
  }

  isLoading = true;

  try {
    console.log('🔄 Fetching next page of transaction history...');

    // New SDK: getTransactionHistory returns Promise<PagedResponse<TransactionHistoryRow>>
    // Call via SDK's RPC directly with cursor support
    const sdk = (currentAvatar as any).sdk;
    const response: PagedResponse<TransactionHistoryRow> = await sdk.rpc.transaction.getTransactionHistory(
      currentAvatar.address,
      PAGE_SIZE,
      nextCursor
    );

    if (response.results.length > 0) {
      nextCursor = response.nextCursor;
      hasMore = response.hasMore;

      _transactionHistory.update((state) => ({
        data: [...state.data, ...response.results],
        next: loadNextPage,
        ended: !response.hasMore,
      }));

      console.log(
        `✅ Loaded ${response.results.length} transactions (hasMore: ${response.hasMore})`
      );
      return true;
    } else {
      hasMore = false;
      _transactionHistory.update((state) => ({
        ...state,
        ended: true,
      }));
      return false;
    }
  } catch (error) {
    console.error('Failed to load transaction history page:', error);
    _transactionHistory.update((state) => ({
      ...state,
      ended: true,
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

  // Validate avatar has SDK reference for RPC calls
  if (!(avatar as any).sdk?.rpc?.transaction) {
    console.error('❌ No SDK RPC transaction methods available on avatar');
    _transactionHistory.set({
      data: [],
      next: async () => false,
      ended: true,
    });
    return;
  }

  // Reset cursor state for new avatar
  nextCursor = null;
  hasMore = true;

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
