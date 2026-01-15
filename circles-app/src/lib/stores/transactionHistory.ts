import type { TransactionHistoryRow } from '@aboutcircles/sdk-rpc';
import { writable } from 'svelte/store';
import type { Avatar } from '@aboutcircles/sdk';
import type { PagedResponse, EnrichedTransaction, Address } from '@aboutcircles/sdk-types';
import { getTransactionHistoryEnriched } from '$lib/utils/sdkHelpers';

const PAGE_SIZE = 25;

// State for cursor-based pagination
let currentAvatar: Avatar | null = null;
let isLoading = false;
let nextCursor: string | null = null;
let hasMore = true;

// Profile cache for enriched transaction participants
const enrichedProfileCache = new Map<string, { name?: string; previewImageUrl?: string }>();

/**
 * Get a cached profile from enriched transactions
 * Can be used by other components to avoid redundant RPC calls
 */
export function getEnrichedProfile(address: Address): { name?: string; previewImageUrl?: string } | undefined {
  return enrichedProfileCache.get(address.toLowerCase());
}

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
 * Load the next page of transactions using enriched endpoint
 * Profiles are pre-loaded and cached for efficiency
 */
async function loadNextPage(): Promise<boolean> {
  if (!currentAvatar || isLoading || !hasMore) {
    return false;
  }

  isLoading = true;

  try {
    console.log('🔄 Fetching enriched transaction history (profiles included)...');

    const sdk = (currentAvatar as any).sdk;
    const response: PagedResponse<EnrichedTransaction> = await getTransactionHistoryEnriched(
      sdk,
      currentAvatar.address as Address,
      0, // fromBlock
      null, // toBlock
      PAGE_SIZE,
      nextCursor
    );

    if (response.results.length > 0) {
      nextCursor = response.nextCursor;
      hasMore = response.hasMore;

      // Cache profiles from enriched transactions
      for (const tx of response.results) {
        if (tx.fromProfile) {
          enrichedProfileCache.set(tx.from.toLowerCase(), tx.fromProfile);
        }
        if (tx.toProfile) {
          enrichedProfileCache.set(tx.to.toLowerCase(), tx.toProfile);
        }
      }

      // Convert EnrichedTransaction to TransactionHistoryRow format
      const rows: TransactionHistoryRow[] = response.results.map((tx) => ({
        blockNumber: tx.blockNumber,
        timestamp: tx.timestamp,
        transactionIndex: tx.transactionIndex,
        logIndex: tx.logIndex,
        transactionHash: tx.transactionHash,
        version: tx.version,
        from: tx.from,
        to: tx.to,
        id: tx.id ?? '',
        tokenAddress: tx.from as Address, // Approximation - enriched doesn't have tokenAddress
        value: tx.value,
        circles: parseFloat(tx.circles),
        staticCircles: parseFloat(tx.staticCircles),
        crc: parseFloat(tx.crc),
      }));

      _transactionHistory.update((state) => ({
        data: [...state.data, ...rows],
        next: loadNextPage,
        ended: !response.hasMore,
      }));

      console.log(
        `✅ Loaded ${response.results.length} enriched transactions (hasMore: ${response.hasMore})`
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
    console.error('Failed to load enriched transaction history:', error);
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
  if (!(avatar as any).sdk?.rpc?.sdk) {
    console.error('❌ No SDK RPC methods available on avatar');
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
