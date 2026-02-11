import type { TransactionHistoryRow } from '@aboutcircles/sdk-rpc';
import { writable, derived, get } from 'svelte/store';
import type { Avatar, Sdk } from '@aboutcircles/sdk';
import type { PagedResponse, EnrichedTransaction, Address } from '@aboutcircles/sdk-types';
import { getTransactionHistoryEnriched } from '$lib/utils/sdkHelpers';
import { handleError } from '$lib/utils/errorHandler';
import { circles } from '$lib/stores/circles';
import { getProfile } from '$lib/utils/profile';
import { circlesBalances } from '$lib/stores/circlesBalances';

const PAGE_SIZE = 100; // Fetch 100 events - they get grouped by tx hash
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Parse a numeric value that may be hex-encoded (e.g. "0x53444835ec580000")
 * or a regular decimal string. Returns a JS number.
 * Handles: hex bigints, decimal strings, plain numbers, "0", empty/null.
 */
function parseNumericValue(raw: unknown): number {
  if (raw == null) return 0;
  if (typeof raw === 'number') return raw;
  const str = String(raw).trim();
  if (!str || str === '0') return 0;
  if (str.startsWith('0x') || str.startsWith('0X')) {
    try {
      return Number(BigInt(str));
    } catch {
      return 0;
    }
  }
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

/**
 * Extended transaction row with event type and operator
 */
export type ExtendedTransactionRow = TransactionHistoryRow & {
  eventType?: string; // e.g., "CrcV2_PersonalMint", "CrcV2_TransferSingle"
  operator?: Address; // WHO initiated the transaction (ERC-1155 operator field)
  group?: Address; // Group address for GroupMint/GroupRedeem events
};

/**
 * Grouped transaction representing multiple events consolidated by transactionHash.
 * Shows net amount and primary counterparty, with expandable drill-down to individual events.
 */
export type GroupedTransaction = {
  transactionHash: string;
  timestamp: number; // Unix timestamp from the SDK
  netCircles: number; // Positive = received, negative = sent
  counterparty: Address; // Final sender or recipient
  events: ExtendedTransactionRow[]; // All events for drill-down
  eventCount: number;
  type: 'send' | 'receive' | 'mint' | 'burn' | 'hop' | 'complex';
  eventTypes: string[]; // Unique event types in this transaction
  hasMint: boolean; // Any event from zero address
  hasBurn: boolean; // Any event to zero address
  isIntermediary: boolean; // True if user was just a hop in someone else's transfer
  isOperatorOnly: boolean; // True if user only signed/initiated but wasn't in from/to (relayed for others)
  initiator?: Address; // WHO started this transaction (operator field from ERC-1155)
  userIsInitiator: boolean; // Did current user initiate this transaction?
  groupAddress?: Address; // Group address for GroupMint/GroupRedeem transactions
};

// State for cursor-based pagination
let currentAvatar: Avatar | null = null;
let currentAvatarAddress: string = '';
let isLoading = false;
let nextCursor: string | null = null;
let hasMore = true;

// Profile cache for enriched transaction participants
const enrichedProfileCache = new Map<string, { name?: string; previewImageUrl?: string }>();

// ERC20 wrapper to token owner lookup (built from user's balance data - no RPC needed)
// Maps tokenAddress (ERC20 wrapper) → tokenOwner (the underlying avatar)
const erc20WrapperOwnerCache = new Map<string, string>();

/**
 * Build ERC20 wrapper owner lookup from user's balance data.
 * Called when balances change. Zero additional RPC calls!
 */
export function refreshErc20WrapperCache(): void {
  const balances = get(circlesBalances);
  if (!balances?.data) return;

  let added = 0;
  for (const balance of balances.data) {
    // ERC20 wrappers have tokenAddress !== tokenOwner
    if (balance.isErc20 && balance.tokenAddress && balance.tokenOwner) {
      const addrLower = balance.tokenAddress.toLowerCase();
      if (!erc20WrapperOwnerCache.has(addrLower)) {
        erc20WrapperOwnerCache.set(addrLower, balance.tokenOwner);
        added++;
      }
    }
  }
  if (added > 0) {
    console.log(`[TxHistory] Cached ${added} ERC20 wrapper owners from balance data`);
  }
}

/**
 * Get the token owner for an ERC20 wrapper address.
 * Returns undefined if not a known ERC20 wrapper.
 */
export function getErc20WrapperOwner(address: Address): Address | undefined {
  return erc20WrapperOwnerCache.get(address.toLowerCase()) as Address | undefined;
}

// Reactive counter to trigger UI updates when cache changes
// Components can subscribe to this to re-render when profiles are fetched
import { writable as svelteWritable } from 'svelte/store';
export const profileCacheVersion = svelteWritable(0);

/**
 * Get a cached profile from enriched transactions
 * Can be used by other components to avoid redundant RPC calls
 */
export function getEnrichedProfile(address: Address): { name?: string; previewImageUrl?: string } | undefined {
  return enrichedProfileCache.get(address.toLowerCase());
}

/**
 * Prefetch profiles for a list of addresses and populate the cache.
 * Used by UI components (e.g., pass-through expansion) to resolve names on-demand.
 * Returns when all profiles have been fetched.
 */
export async function prefetchProfilesForAddresses(addresses: (string | Address)[]): Promise<void> {
  // Filter out already-cached and zero addresses
  const uncached = addresses
    .map(a => a.toLowerCase())
    .filter(addr => addr !== ZERO_ADDRESS && !enrichedProfileCache.has(addr));

  if (uncached.length === 0) return;

  console.log(`[TxHistory] Prefetching ${uncached.length} profiles on-demand...`);

  const results = await Promise.all(
    uncached.map(async (addr) => {
      try {
        const profile = await getProfile(addr as Address);
        return { addr, profile };
      } catch {
        return { addr, profile: null };
      }
    })
  );

  let addedCount = 0;
  for (const { addr, profile } of results) {
    if (profile?.name) {
      enrichedProfileCache.set(addr, {
        name: profile.name,
        previewImageUrl: profile.previewImageUrl
      });
      addedCount++;
    }
  }

  // Trigger reactive update so components re-render with new names
  if (addedCount > 0) {
    profileCacheVersion.update(v => v + 1);
  }
}

/**
 * Pre-fetch profiles for all transaction participants.
 * Extracts unique addresses from transactions and batch-fetches their profiles,
 * then populates the enrichedProfileCache for synchronous access by getDisplayName().
 */
async function prefetchProfilesForTransactions(rows: ExtendedTransactionRow[]): Promise<void> {
  const addresses = new Set<string>();

  for (const row of rows) {
    if (row.from) addresses.add(row.from.toLowerCase());
    if (row.to) addresses.add(row.to.toLowerCase());
    if (row.operator) addresses.add(row.operator.toLowerCase());
  }

  // Filter out zero address and already-cached addresses
  addresses.delete(ZERO_ADDRESS);
  const uncachedAddresses = Array.from(addresses).filter(
    addr => !enrichedProfileCache.has(addr)
  );

  if (uncachedAddresses.length === 0) return;

  console.log(`[TxHistory] Pre-fetching ${uncachedAddresses.length} profiles...`);

  // Batch fetch all profiles (uses existing aggregator which batches efficiently)
  const profileResults = await Promise.all(
    uncachedAddresses.map(async (addr) => {
      try {
        const profile = await getProfile(addr as Address);
        return { addr, profile };
      } catch {
        return { addr, profile: null };
      }
    })
  );

  // Populate enriched cache so getDisplayName() can find them synchronously
  let addedCount = 0;
  for (const { addr, profile } of profileResults) {
    if (profile?.name) {
      enrichedProfileCache.set(addr, {
        name: profile.name,
        previewImageUrl: profile.previewImageUrl
      });
      addedCount++;
    }
  }

  console.log(`[TxHistory] Cached ${addedCount} profiles`);

  // Trigger reactive update so components re-render with new names
  if (addedCount > 0) {
    profileCacheVersion.update(v => v + 1);
  }
}

/**
 * Group transaction events by transactionHash and calculate net amounts.
 * A single blockchain transaction with multiple hops becomes one grouped row.
 */
function groupByTransaction(rows: ExtendedTransactionRow[], userAddress: string): GroupedTransaction[] {
  const groups = new Map<string, ExtendedTransactionRow[]>();

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

    // Find the operator (initiator) - should be same across all events in a tx
    // The operator is WHO called the contract, not whose tokens moved
    const initiator = events.find(e => e.operator)?.operator;
    const userIsInitiator = initiator ? initiator.toLowerCase() === lowerUser : true; // Default to true if no operator info

    // Calculate net circles: positive = received, negative = sent
    // Also track amounts by category to determine dominant action
    let netCircles = 0;
    let counterparty: Address = ZERO_ADDRESS as Address;
    let hasMint = false;
    let hasBurn = false;

    // Track amounts by category for dominant action detection
    let burnAmount = 0;
    let mintAmount = 0;
    let transferOutAmount = 0;
    let transferInAmount = 0;

    for (const event of events) {
      // Skip events with missing addresses
      if (!event.from || !event.to) continue;

      const fromLower = event.from.toLowerCase();
      const toLower = event.to.toLowerCase();
      const amount = event.circles ?? 0;

      if (fromLower === ZERO_ADDRESS) hasMint = true;
      if (toLower === ZERO_ADDRESS) hasBurn = true;

      // Categorize the event and accumulate amounts
      if (fromLower === ZERO_ADDRESS && toLower === lowerUser) {
        // Minted to user
        mintAmount += amount;
        netCircles += amount;
      } else if (fromLower === lowerUser && toLower === ZERO_ADDRESS) {
        // Burned by user
        burnAmount += amount;
        netCircles -= amount;
      } else if (toLower === lowerUser && fromLower !== lowerUser) {
        // Received from someone else
        transferInAmount += amount;
        netCircles += amount;
        // Track counterparty (prefer non-zero addresses)
        if (fromLower !== ZERO_ADDRESS) {
          counterparty = event.from as Address;
        }
      } else if (fromLower === lowerUser && toLower !== lowerUser) {
        // Sent to someone else
        transferOutAmount += amount;
        netCircles -= amount;
        // Track counterparty (prefer non-zero addresses)
        if (toLower !== ZERO_ADDRESS) {
          counterparty = event.to as Address;
        }
      }
    }

    // Fallback: if counterparty is still zero, find any non-zero, non-user address
    if (counterparty.toLowerCase() === ZERO_ADDRESS) {
      for (const event of events) {
        const fromLower = event.from?.toLowerCase();
        const toLower = event.to?.toLowerCase();
        if (fromLower && fromLower !== ZERO_ADDRESS && fromLower !== lowerUser) {
          counterparty = event.from as Address;
          break;
        }
        if (toLower && toLower !== ZERO_ADDRESS && toLower !== lowerUser) {
          counterparty = event.to as Address;
          break;
        }
      }
    }

    // Determine transaction type based on EVENT TYPES (semantic meaning), not just addresses
    // This ensures path transfers with incidental burns/mints show as send/receive
    let type: GroupedTransaction['type'] = 'complex';

    // Collect event types to understand what actually happened
    const eventTypesSet = new Set(events.map(e => e.eventType).filter(Boolean));
    const hasStreamCompleted = eventTypesSet.has('CrcV2_StreamCompleted');
    const hasTransfer = eventTypesSet.has('CrcV2_TransferSingle') || eventTypesSet.has('CrcV2_TransferBatch') || eventTypesSet.has('CrcV2_Transfer');
    const hasGroupMint = eventTypesSet.has('CrcV2_GroupMint');
    const hasPersonalMint = eventTypesSet.has('CrcV2_PersonalMint');
    const hasGroupRedeem = eventTypesSet.has('CrcV2_GroupRedeemCollateralBurn') || eventTypesSet.has('CrcV2_GroupRedeemCollateralReturn');

    // Priority 1: Path transfers (StreamCompleted) - detect hops vs real transfers
    if (hasStreamCompleted || (hasTransfer && (transferOutAmount > 0 || transferInAmount > 0))) {
      // Check if user was just a hop: tokens in ≈ tokens out (within 1% tolerance)
      const isLikelyHop = transferInAmount > 0 && transferOutAmount > 0 &&
        Math.abs(transferInAmount - transferOutAmount) / Math.max(transferInAmount, transferOutAmount) < 0.01;

      if (isLikelyHop && !userIsInitiator) {
        // User was an intermediate hop in someone else's path transfer
        type = 'hop';
      } else if (isLikelyHop && userIsInitiator) {
        // User initiated but their net is ~0 (unusual - maybe multi-path?)
        // Classify based on net direction
        type = netCircles >= 0 ? 'receive' : 'send';
      } else if (netCircles > 0) {
        type = 'receive';
      } else if (netCircles < 0) {
        // User's tokens went out - but did they initiate it?
        if (userIsInitiator) {
          type = 'send';
        } else {
          type = 'hop';
        }
      }
    }
    // Priority 2: Group operations
    else if (hasGroupMint) {
      type = 'mint'; // Could add 'groupMint' type later for better UI
    }
    else if (hasGroupRedeem) {
      type = 'burn'; // Could add 'groupRedeem' type later
    }
    // Priority 3: Pure personal mint (no transfers involved)
    else if (hasPersonalMint && !hasTransfer && transferOutAmount === 0) {
      type = 'mint';
    }
    // Priority 4: Pure burn (only burns, no other activity)
    else if (hasBurn && !hasMint && burnAmount > 0 && transferInAmount === 0 && transferOutAmount === 0) {
      type = 'burn';
    }
    // Priority 5: If counterparty is zero and we have mint, it's a mint (not "receive from zero")
    else if (counterparty.toLowerCase() === ZERO_ADDRESS && hasMint && netCircles > 0) {
      type = 'mint';
    }
    // Priority 6: Fallback to net direction (only if we have a real counterparty)
    else if (netCircles > 0) {
      type = counterparty.toLowerCase() === ZERO_ADDRESS ? 'mint' : 'receive';
    } else if (netCircles < 0) {
      if (counterparty.toLowerCase() === ZERO_ADDRESS) {
        type = 'burn';
      } else if (userIsInitiator) {
        type = 'send';
      } else {
        type = 'hop'; // User's tokens used by someone else
      }
    }
    // Keep as 'complex' if net is zero and no clear dominant action

    // Use first event's timestamp (events are sorted by logIndex)
    const timestamp = events[0].timestamp;

    // Collect unique event types
    const eventTypes = [...new Set(events.map(e => e.eventType).filter(Boolean))] as string[];

    // Extract group address from GroupMint/GroupRedeem events
    const groupAddress = events.find(e => e.group)?.group;

    // Check if user actually participated in any event (as from or to, not just operator)
    const userParticipatedInEvents = events.some(e => {
      const fromLower = e.from?.toLowerCase();
      const toLower = e.to?.toLowerCase();
      return fromLower === lowerUser || toLower === lowerUser;
    });

    // Detect intermediary transactions: user was just a hop in someone else's transfer
    // Characteristics: very small net amount relative to transaction volume
    // Exception: mints are never intermediary (daily circles belong to user)
    //
    // IMPORTANT: Only mark as intermediary if user ACTUALLY participated in from/to fields.
    // If user was only the operator (signed the tx but tokens flowed between others),
    // that's a different scenario - show as 'complex', not 'intermediary'.
    //
    // Use RELATIVE threshold: if net is <5% of total volume, it's likely a pass-through
    // This handles path transfers with small fees (e.g., 100 CRC transfer with 0.5 CRC fee)
    const totalVolume = transferInAmount + transferOutAmount + mintAmount;
    const relativeNet = totalVolume > 0 ? Math.abs(netCircles) / totalVolume : 0;

    // Mark as intermediary if user has negligible involvement in this transaction.
    // Covers two cases:
    //   a) User appeared in from/to but net is ~0 (classic pass-through hop)
    //   b) User didn't initiate and has tiny dust net (e.g. group mints by others that
    //      touched user's trust path, resulting in +0.01 CRC dust)
    const smallNet = Math.abs(netCircles) <= 0.05 || (totalVolume > 0.1 && relativeNet < 0.05);
    const isIntermediary = smallNet && type !== 'mint' && (
      userParticipatedInEvents ||  // case (a): participated but net ~0
      (!userIsInitiator && Math.abs(netCircles) <= 0.05)  // case (b): didn't initiate, dust net
    );

    // Debug: log transactions with small net that AREN'T marked as intermediary
    if (Math.abs(netCircles) <= 0.05 && !isIntermediary && netCircles !== 0) {
      console.log('[TxHistory] Small net NOT intermediary:', {
        hash: hash.slice(0, 10),
        netCircles: netCircles.toFixed(4),
        type,
        userParticipated: userParticipatedInEvents,
        smallNet,
        totalVolume: totalVolume.toFixed(2),
        transferIn: transferInAmount.toFixed(2),
        transferOut: transferOutAmount.toFixed(2),
        mintAmount: mintAmount.toFixed(2),
        eventTypes,
      });
    }

    // Detect operator-only transactions: user signed but tokens flowed between others
    const isOperatorOnly = !userParticipatedInEvents && userIsInitiator;

    // If user only initiated (operator) but didn't participate in from/to, classify as 'complex'
    if (!userParticipatedInEvents && type !== 'mint' && type !== 'burn') {
      type = 'complex';
    }

    return {
      transactionHash: hash,
      timestamp,
      netCircles,
      counterparty,
      events,
      eventCount: events.length,
      type,
      eventTypes,
      hasMint,
      hasBurn,
      isIntermediary,
      isOperatorOnly,
      initiator,
      userIsInitiator,
      groupAddress,
    };
  });
}

const _transactionHistory = writable<{
  data: ExtendedTransactionRow[];
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
  console.log('[TxHistory] loadNextPage called', { hasAvatar: !!currentAvatar, isLoading, hasMore });

  if (!currentAvatar || isLoading || !hasMore) {
    console.log('[TxHistory] loadNextPage early return - conditions not met');
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

    // Use circles_events directly since circles_getTransactionHistory is broken on the RPC
    // Filter for transfer-related events only
    const transferEventTypes = [
      'CrcV2_TransferSingle',
      'CrcV2_TransferBatch',
      'CrcV2_Erc20WrapperTransfer',
      'CrcV2_PersonalMint',
      'CrcV2_GroupMintSingle',
      'CrcV2_GroupMintBatch',
      'CrcV2_GroupRedeem',
      'CrcV2_GroupRedeemCollateralReturn',
      'CrcV2_GroupRedeemCollateralBurn',
      'CrcV2_StreamCompleted',
    ];

    console.log('[TxHistory] Fetching events via circles_events...');

    // Use the raw RPC client to call circles_events
    // Parameters: [address, fromBlock, toBlock, eventTypes, filterPredicates, sortAscending, limit, cursor]
    const eventsResponse = await (sdk as Sdk).rpc.client.call(
      'circles_events',
      [currentAvatar.address, 0, null, transferEventTypes, null, false, PAGE_SIZE, nextCursor ?? null]
    ) as { events?: unknown[]; results?: unknown[]; hasMore: boolean; nextCursor?: string };

    // Handle both response formats (events array or results array)
    const events = eventsResponse.events || eventsResponse.results || [];
    console.log('[TxHistory] Events RPC response:', { resultCount: events.length, hasMore: eventsResponse.hasMore });

    // Convert events to EnrichedTransaction format
    const response: PagedResponse<EnrichedTransaction> = {
      hasMore: eventsResponse.hasMore,
      nextCursor: eventsResponse.nextCursor ?? null,
      results: events.map((evt: unknown) => {
        const e = evt as { event: string; values: Record<string, unknown> };
        const vals = e.values || {};

        // Debug: log burn events to see their structure
        if (vals.to === ZERO_ADDRESS || (vals.to as string)?.toLowerCase() === ZERO_ADDRESS) {
          console.log('[TxHistory] Burn event structure:', { event: e.event, vals });
        }

        // Debug: log operator info for TransferSingle events to verify extraction
        if (e.event === 'CrcV2_TransferSingle' && vals.operator) {
          console.log('[TxHistory] TransferSingle with operator:', {
            operator: vals.operator,
            from: vals.from,
            to: vals.to,
          });
        }

        // Extract amount - check multiple possible field names
        // RPC may return hex-encoded bigints (e.g. "0x53444835ec580000")
        const rawAmount = vals.amount || vals.value || vals.attoValue || '0';
        const amountStr = typeof rawAmount === 'string' ? rawAmount : String(rawAmount);
        // Convert from wei (1e18) to CRC — parseNumericValue handles hex
        const circlesAmount = amountStr !== '0' ? parseNumericValue(amountStr) / 1e18 : 0;

        return {
          blockNumber: parseInt(vals.blockNumber as string, 16) || 0,
          timestamp: parseInt(vals.timestamp as string, 16) || 0,
          transactionIndex: parseInt(vals.transactionIndex as string, 16) || 0,
          logIndex: parseInt(vals.logIndex as string, 16) || 0,
          transactionHash: vals.transactionHash as string,
          version: 2,
          from: vals.from as Address,
          to: vals.to as Address,
          operator: vals.operator as Address | undefined, // ERC-1155: WHO initiated the tx
          group: vals.group as Address | undefined, // Group address for GroupMint/GroupRedeem
          id: vals.id as string || '',
          value: amountStr,
          circles: circlesAmount,
          $event: e.event,
        } as unknown as EnrichedTransaction;
      }),
    };

    if (response.results.length > 0) {
      nextCursor = response.nextCursor;
      hasMore = response.hasMore;

      // Cache profiles from enriched transactions
      for (const tx of response.results) {
        const raw = tx as unknown as Record<string, unknown>;
        const fromAddr = tx.from || raw['from_address'] || raw['sender'] || raw['fromAddress'];
        const toAddr = tx.to || raw['to_address'] || raw['receiver'] || raw['toAddress'];

        if (tx.fromProfile && fromAddr) {
          enrichedProfileCache.set((fromAddr as string).toLowerCase(), tx.fromProfile);
        }
        if (tx.toProfile && toAddr) {
          enrichedProfileCache.set((toAddr as string).toLowerCase(), tx.toProfile);
        }
      }

      // Convert EnrichedTransaction to ExtendedTransactionRow format
      // Handle potential alternative field names from server (including nested event structure)
      // Missing addresses default to ZERO_ADDRESS for safety
      const rows: ExtendedTransactionRow[] = response.results.map((tx): ExtendedTransactionRow => {
        const raw = tx as unknown as Record<string, unknown>;
        // Server might return nested event structure or flat structure
        const event = (raw['event'] as Record<string, unknown>) || {};

        // Extract event type (e.g., "CrcV2_PersonalMint", "CrcV2_TransferSingle")
        // Priority: $event (set by us) > nested event.type > other alternatives
        let eventType = (raw['$event'] || event['type'] || raw['type'] || raw['eventType']) as string | undefined;

        // Try multiple possible field names for from/to/operator addresses
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
        // Operator: WHO initiated the transaction (ERC-1155 standard)
        // Only available on TransferSingle/TransferBatch events, not Erc20WrapperTransfer
        const operatorAddr = (raw as { operator?: unknown })['operator'] ||
          event['operator'];
        // Group address: for GroupMint/GroupRedeem events
        const groupAddr = (raw as { group?: unknown })['group'] ||
          event['group'];

        // Extract amount fields with proper unit handling
        // SDK provides multiple formats - use the most reliable
        const circlesVal = tx.circles || event['circles'] || raw['circles'];
        const attoCirclesVal = tx.attoCircles || event['attoCircles'] || raw['attoCircles'];
        const crcVal = tx.crc || event['crc'] || raw['crc'];
        const attoCrcVal = tx.attoCrc || event['attoCrc'] || raw['attoCrc'];
        const staticCirclesVal = tx.staticCircles || event['staticCircles'] || raw['static_circles'];
        const valueVal = tx.value || event['value'] || raw['value'] || '0';

        // Determine the correct amount with proper unit handling
        let circlesAmount = 0;

        // Priority: human-readable fields first, then atto fields (divide by 1e18)
        // All parsing uses parseNumericValue() to handle hex-encoded bigints from RPC
        if (circlesVal && circlesVal !== '0') {
          circlesAmount = parseNumericValue(circlesVal);
        } else if (crcVal && crcVal !== '0') {
          circlesAmount = parseNumericValue(crcVal);
        } else if (attoCirclesVal && attoCirclesVal !== '0') {
          circlesAmount = parseNumericValue(attoCirclesVal) / 1e18;
        } else if (attoCrcVal && attoCrcVal !== '0') {
          circlesAmount = parseNumericValue(attoCrcVal) / 1e18;
        } else if (valueVal && valueVal !== '0') {
          const val = parseNumericValue(valueVal);
          // If value > 1e15, it's likely in wei (atto) units
          circlesAmount = val > 1e15 ? val / 1e18 : val;
        }

        // Infer event type from addresses if SDK didn't provide it
        if (!eventType) {
          const fromLower = (fromAddr as string)?.toLowerCase() || '';
          const toLower = (toAddr as string)?.toLowerCase() || '';
          if (fromLower === ZERO_ADDRESS) {
            eventType = 'CrcV2_PersonalMint';
          } else if (toLower === ZERO_ADDRESS) {
            eventType = 'CrcV2_Burn';
          } else {
            eventType = 'CrcV2_Transfer';
          }
        }

        // Use ZERO_ADDRESS as fallback for missing addresses
        // This allows events to be displayed even if addresses are incomplete
        const finalFrom = (fromAddr && (fromAddr as string).length === 42)
          ? fromAddr as Address
          : ZERO_ADDRESS as Address;
        const finalTo = (toAddr && (toAddr as string).length === 42)
          ? toAddr as Address
          : ZERO_ADDRESS as Address;

        // Extract operator if present (valid 42-char address)
        const finalOperator = (operatorAddr && (operatorAddr as string).length === 42)
          ? operatorAddr as Address
          : undefined;

        // Extract group address if present (for GroupMint/GroupRedeem)
        const finalGroup = (groupAddr && (groupAddr as string).length === 42)
          ? groupAddr as Address
          : undefined;

        return {
          blockNumber: tx.blockNumber,
          timestamp: tx.timestamp,
          transactionIndex: tx.transactionIndex,
          logIndex: tx.logIndex,
          transactionHash: tx.transactionHash,
          version: tx.version ?? 2,
          from: finalFrom,
          to: finalTo,
          operator: finalOperator,
          group: finalGroup,
          id: tx.id ?? '',
          tokenAddress: finalFrom,
          value: valueVal as string,
          circles: circlesAmount,
          staticCircles: staticCirclesVal ? parseFloat(staticCirclesVal as string) : 0,
          crc: crcVal ? parseFloat(crcVal as string) : 0,
          eventType,
        };
      });

      console.log('[TxHistory] Mapped rows:', rows.length);

      // Pre-fetch profiles for all transaction participants
      // This populates enrichedProfileCache for getDisplayName() to use synchronously
      await prefetchProfilesForTransactions(rows);

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
  console.log('[TxHistory] initTransactionHistoryStore called for:', avatar?.address);

  // Early return if already initialized for this avatar - don't reset, don't reload
  if (currentAvatarAddress === avatar.address && currentAvatar) {
    console.log('[TxHistory] Already initialized for this avatar, skipping');
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

  // Build ERC20 wrapper cache from user's balance data (no RPC needed)
  refreshErc20WrapperCache();

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

    // Filter out transactions where user has no meaningful involvement:
    // 1. operator-only (signed but not in from/to) with negligible net amount
    // 2. intermediary pass-throughs the user didn't initiate with negligible net
    //    (e.g., group mints by others that routed through user's trust path,
    //    resulting in dust amounts flowing in and out)
    cachedGrouped = cachedGrouped.filter(tx => {
      // Case 1: user only signed, wasn't in from/to
      if (tx.isOperatorOnly && Math.abs(tx.netCircles) <= 0.05) return false;
      // Case 2: pass-through hop the user didn't start, net ≈ 0
      if (tx.isIntermediary && !tx.userIsInitiator && Math.abs(tx.netCircles) <= 0.05) return false;
      return true;
    });

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

/**
 * Force-refresh transaction history by resetting cursor/cache and refetching.
 * Unlike initTransactionHistoryStore(), this bypasses the "already initialized" guard
 * so new transactions (from WebSocket events) actually appear.
 */
export async function refreshTransactionHistory(): Promise<void> {
  if (!currentAvatar || !currentAvatarAddress) {
    console.log('[TxHistory] refreshTransactionHistory: no avatar, skipping');
    return;
  }

  console.log('[TxHistory] refreshTransactionHistory: resetting and refetching');

  // Reset pagination state
  nextCursor = null;
  hasMore = true;
  isLoading = false;

  // Clear memoization cache for fresh grouping
  resetGroupedCache();

  // Reset store with loading=true
  _transactionHistory.set({
    data: [],
    next: loadNextPage,
    ended: false,
    isLoading: true,
  });

  // Refetch from page 1
  await loadNextPage();
}
