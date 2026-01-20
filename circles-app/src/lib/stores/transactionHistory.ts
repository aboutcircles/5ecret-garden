import type { TransactionHistoryRow } from '@aboutcircles/sdk-rpc';
import { writable, derived } from 'svelte/store';
import type { Avatar } from '@aboutcircles/sdk';
import type { PagedResponse, EnrichedTransaction, Address } from '@aboutcircles/sdk-types';
import { getTransactionHistoryEnriched } from '$lib/utils/sdkHelpers';

const PAGE_SIZE = 25;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Grouped transaction representing multiple events consolidated by transactionHash.
 * Shows net amount and primary counterparty, with expandable drill-down to individual events.
 */
export type GroupedTransaction = {
  transactionHash: string;
  timestamp: number; // Unix timestamp from the SDK
  netCircles: number; // Positive = received, negative = sent
  counterparty: Address; // Final sender or recipient
  events: TransactionHistoryRow[]; // All events for drill-down
  eventCount: number;
  type: 'send' | 'receive' | 'mint' | 'burn' | 'complex';
};

// State for cursor-based pagination
let currentAvatar: Avatar | null = null;
let currentAvatarAddress: string = '';
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

/**
 * Group transaction events by transactionHash and calculate net amounts.
 * A single blockchain transaction with multiple hops becomes one grouped row.
 */
function groupByTransaction(rows: TransactionHistoryRow[], userAddress: string): GroupedTransaction[] {
  const groups = new Map<string, TransactionHistoryRow[]>();

  // Group events by transaction hash
  for (const row of rows) {
    const key = row.transactionHash;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const lowerUser = userAddress.toLowerCase();

  return Array.from(groups.entries()).map(([hash, events]) => {
    // Sort events by logIndex for consistent ordering
    events.sort((a, b) => a.logIndex - b.logIndex);

    // Calculate net circles: positive = received, negative = sent
    let netCircles = 0;
    let counterparty: Address = ZERO_ADDRESS as Address;
    let hasMint = false;
    let hasBurn = false;

    for (const event of events) {
      const fromLower = event.from.toLowerCase();
      const toLower = event.to.toLowerCase();

      if (fromLower === ZERO_ADDRESS) hasMint = true;
      if (toLower === ZERO_ADDRESS) hasBurn = true;

      // Accumulate net amount
      if (toLower === lowerUser && fromLower !== lowerUser) {
        // Received
        netCircles += event.circles ?? 0;
        // Track counterparty (prefer non-zero addresses)
        if (fromLower !== ZERO_ADDRESS) {
          counterparty = event.from as Address;
        }
      } else if (fromLower === lowerUser && toLower !== lowerUser) {
        // Sent
        netCircles -= event.circles ?? 0;
        // Track counterparty (prefer non-zero addresses)
        if (toLower !== ZERO_ADDRESS) {
          counterparty = event.to as Address;
        }
      }
    }

    // Determine transaction type
    let type: GroupedTransaction['type'] = 'complex';
    if (events.length === 1) {
      if (hasMint) type = 'mint';
      else if (hasBurn) type = 'burn';
      else if (netCircles > 0) type = 'receive';
      else if (netCircles < 0) type = 'send';
    } else {
      // Multi-hop transaction
      if (netCircles > 0) type = 'receive';
      else if (netCircles < 0) type = 'send';
    }

    // Use first event's timestamp (events are sorted by logIndex)
    const timestamp = events[0].timestamp;

    return {
      transactionHash: hash,
      timestamp,
      netCircles,
      counterparty,
      events,
      eventCount: events.length,
      type,
    };
  });
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
  currentAvatarAddress = avatar.address;
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

/**
 * Derived store that groups transactions by hash.
 * Shows consolidated rows with net amounts and expandable drill-down.
 */
export const groupedTransactionHistory = derived(
  _transactionHistory,
  ($txHistory) => {
    if (!currentAvatarAddress || !$txHistory.data.length) {
      return {
        data: [] as GroupedTransaction[],
        next: $txHistory.next,
        ended: $txHistory.ended,
      };
    }

    const grouped = groupByTransaction($txHistory.data, currentAvatarAddress);
    // Sort by timestamp descending (most recent first)
    grouped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      data: grouped,
      next: $txHistory.next,
      ended: $txHistory.ended,
    };
  }
);
