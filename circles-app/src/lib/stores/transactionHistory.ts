import type { TransactionHistoryRow } from '@aboutcircles/sdk-rpc';
import { writable, derived, get } from 'svelte/store';
import type { Avatar, Sdk } from '@aboutcircles/sdk';
import type { PagedResponse, EnrichedTransaction, Address } from '@aboutcircles/sdk-types';
import { getTransactionHistoryEnriched } from '$lib/utils/sdkHelpers';
import { handleError } from '$lib/utils/errorHandler';
import { circles } from '$lib/stores/circles';

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
      // Skip events with missing addresses
      if (!event.from || !event.to) continue;

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

    // Only classify as mint/burn if it's a SINGLE event with zero address
    // Multi-hop transactions with mints/burns are transfers, not pure mints/burns
    if (events.length === 1) {
      if (hasMint) {
        type = 'mint';
      } else if (hasBurn) {
        type = 'burn';
      } else if (netCircles > 0) {
        type = 'receive';
      } else if (netCircles < 0) {
        type = 'send';
      }
    } else {
      // Multi-event: classify by net flow direction
      if (netCircles > 0) {
        type = 'receive';
      } else if (netCircles < 0) {
        type = 'send';
      }
      // Keep as 'complex' if net is zero
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
  isLoading: boolean;
}>({
  data: [],
  next: async () => false,
  ended: false,
  isLoading: true, // Start with loading=true until first fetch completes
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
  _transactionHistory.update((state) => ({ ...state, isLoading: true }));

  try {
    // Use global circles store - more reliable than extracting from avatar
    const sdk = get(circles);
    if (!sdk) {
      console.error('[TxHistory] SDK not available in circles store');
      throw new Error('SDK not available');
    }

    const response: PagedResponse<EnrichedTransaction> = await getTransactionHistoryEnriched(
      sdk as Sdk,
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
        const raw = tx as Record<string, unknown>;
        const fromAddr = tx.from || raw['from_address'] || raw['sender'] || raw['fromAddress'];
        const toAddr = tx.to || raw['to_address'] || raw['receiver'] || raw['toAddress'];

        if (tx.fromProfile && fromAddr) {
          enrichedProfileCache.set((fromAddr as string).toLowerCase(), tx.fromProfile);
        }
        if (tx.toProfile && toAddr) {
          enrichedProfileCache.set((toAddr as string).toLowerCase(), tx.toProfile);
        }
      }

      // Debug: log first tx to verify full structure
      if (response.results.length > 0) {
        const sample = response.results[0];
        console.log('[TxHistory] Sample tx structure:', JSON.stringify(sample, null, 2));
        console.log('[TxHistory] Sample tx keys:', Object.keys(sample));
        // Check for alternative field names and nested structure
        const raw = sample as Record<string, unknown>;
        const nested = (raw['event'] as Record<string, unknown>) || {};
        console.log('[TxHistory] Nested event keys:', Object.keys(nested));
        console.log('[TxHistory] from:', sample.from, '| nested.from:', nested['from']);
        console.log('[TxHistory] to:', sample.to, '| nested.to:', nested['to']);
        console.log('[TxHistory] circles:', sample.circles, '| nested.circles:', nested['circles']);
      }

      // Convert EnrichedTransaction to TransactionHistoryRow format
      // Handle potential alternative field names from server (including nested event structure)
      const rows: TransactionHistoryRow[] = response.results.map((tx) => {
        const raw = tx as Record<string, unknown>;
        // Server might return nested event structure or flat structure
        const event = (raw['event'] as Record<string, unknown>) || {};

        // Try multiple possible field names for from/to addresses
        // Priority: flat fields > nested event fields > alternative names
        const fromAddr = tx.from ||
          event['from'] ||
          raw['from_address'] ||
          event['from_address'] ||
          raw['sender'];
        const toAddr = tx.to ||
          event['to'] ||
          raw['to_address'] ||
          event['to_address'] ||
          raw['receiver'];

        // Same for circles/value - might be nested in event
        // SDK returns 'value' in wei (1e18), need to convert to CRC
        const valueVal = tx.value || event['value'] || raw['value'] || '0';
        const circlesVal = tx.circles || event['circles'] || raw['circles'];
        const staticCirclesVal = tx.staticCircles || event['staticCircles'] || raw['static_circles'];
        const crcVal = tx.crc || event['crc'] || raw['crc'];

        // Convert value (wei) to CRC if circles field not provided
        let circlesAmount = 0;
        if (circlesVal) {
          circlesAmount = parseFloat(circlesVal as string);
        } else if (valueVal && valueVal !== '0') {
          // value is in wei (1e18 = 1 CRC)
          circlesAmount = parseFloat(valueVal as string) / 1e18;
        }

        return {
          blockNumber: tx.blockNumber,
          timestamp: tx.timestamp,
          transactionIndex: tx.transactionIndex,
          logIndex: tx.logIndex,
          transactionHash: tx.transactionHash,
          version: tx.version ?? 2,
          from: (fromAddr as Address) ?? (ZERO_ADDRESS as Address),
          to: (toAddr as Address) ?? (ZERO_ADDRESS as Address),
          id: tx.id ?? '',
          tokenAddress: ((fromAddr || ZERO_ADDRESS) as Address),
          value: valueVal as string,
          circles: circlesAmount,
          staticCircles: staticCirclesVal ? parseFloat(staticCirclesVal as string) : 0,
          crc: crcVal ? parseFloat(crcVal as string) : 0,
        };
      });

      _transactionHistory.update((state) => ({
        data: [...state.data, ...rows],
        next: loadNextPage,
        ended: !response.hasMore,
        isLoading: false,
      }));

      return true;
    } else {
      hasMore = false;
      _transactionHistory.update((state) => ({
        ...state,
        ended: true,
        isLoading: false,
      }));
      return false;
    }
  } catch (error) {
    // Log the actual error for debugging
    console.error('[TxHistory] FAILED to load transactions:', error);
    // Don't show notification for transaction history errors (user can retry)
    handleError(error, {
      context: 'transaction',
      notify: false,
    });
    _transactionHistory.update((state) => ({
      ...state,
      ended: true,
      isLoading: false,
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
  // Early return if already initialized for this avatar - don't reset, don't reload
  if (currentAvatarAddress === avatar.address && currentAvatar) {
    return;
  }

  // Reset state
  currentAvatar = avatar;
  currentAvatarAddress = avatar.address;
  isLoading = false;

  // Clear memoization cache for fresh grouping
  resetGroupedCache();

  // Validate avatar is properly initialized
  if (!avatar || typeof avatar !== 'object') {
    console.error('[TxHistory] Avatar is not properly initialized:', avatar);
    _transactionHistory.set({
      data: [],
      next: async () => false,
      ended: true,
      isLoading: false,
    });
    return;
  }

  // Validate avatar has SDK reference for RPC calls
  // Note: Avatar objects don't expose SDK directly, so use global store as primary source
  let sdk = get(circles);
  if (!sdk?.rpc) {
    // Fallback: try global circles store
    sdk = get(circles);
    if (!sdk?.rpc) {
      console.error('[TxHistory] No SDK RPC available (neither on avatar nor global)');
      _transactionHistory.set({
        data: [],
        next: async () => false,
        ended: true,
        isLoading: false,
      });
      return;
    }
  }

  // Reset cursor state for new avatar
  nextCursor = null;
  hasMore = true;

  // Reset store with loading=true for initial fetch
  _transactionHistory.set({
    data: [],
    next: loadNextPage,
    ended: false,
    isLoading: true,
  });

  // Load initial page
  await loadNextPage();
};

export const transactionHistory = _transactionHistory;

// Memoization cache for grouped transactions
// Avoids redundant O(n) grouping + O(n log n) sorting when only metadata changes
let lastDataLength = 0;
let lastAvatarAddress = '';
let cachedGrouped: GroupedTransaction[] = [];

/**
 * Reset the grouped transaction cache.
 * Called when avatar changes to ensure fresh grouping.
 */
function resetGroupedCache() {
  lastDataLength = 0;
  lastAvatarAddress = '';
  cachedGrouped = [];
}

/**
 * Derived store that groups transactions by hash.
 * Shows consolidated rows with net amounts and expandable drill-down.
 *
 * Performance: Memoized to avoid recalculating when only pagination
 * metadata (ended flag, next cursor) changes. Regrouping only occurs
 * when actual transaction data grows.
 */
export const groupedTransactionHistory = derived(
  _transactionHistory,
  ($txHistory) => {
    if (!currentAvatarAddress || !$txHistory.data.length) {
      return {
        data: [] as GroupedTransaction[],
        next: $txHistory.next,
        ended: $txHistory.ended,
        isLoading: $txHistory.isLoading,
      };
    }

    // Skip recalculation if data hasn't changed
    const avatarChanged = currentAvatarAddress !== lastAvatarAddress;
    const dataChanged = $txHistory.data.length !== lastDataLength;

    if (!avatarChanged && !dataChanged && cachedGrouped.length > 0) {
      return {
        data: cachedGrouped,
        next: $txHistory.next,
        ended: $txHistory.ended,
        isLoading: $txHistory.isLoading,
      };
    }

    // Update cache keys
    lastDataLength = $txHistory.data.length;
    lastAvatarAddress = currentAvatarAddress;

    // Perform grouping and sorting
    cachedGrouped = groupByTransaction($txHistory.data, currentAvatarAddress);
    // Sort by timestamp descending (timestamps are numbers, no Date conversion needed)
    cachedGrouped.sort((a, b) => b.timestamp - a.timestamp);

    return {
      data: cachedGrouped,
      next: $txHistory.next,
      ended: $txHistory.ended,
      isLoading: $txHistory.isLoading,
    };
  }
);
