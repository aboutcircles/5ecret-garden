import type { CirclesEvent, CirclesEventType } from '@aboutcircles/sdk-rpc';
import type { TokenBalance } from '@aboutcircles/sdk-types';
import { createEventStore } from '$lib/shared/state/eventStores/eventStoreFactory.svelte';
import type { Avatar } from '@aboutcircles/sdk';
import { writable } from 'svelte/store';
import { writeBalances, makeScopeId } from '$lib/shared/cache';

const refreshOnEvents: Set<CirclesEventType> = new Set<CirclesEventType>([
  'CrcV2_Transfer',
  'CrcV2_TransferBatch',
  'CrcV2_TransferSingle',
  'CrcV2_PersonalMint',
  'CrcV2_GroupMint',
  'CrcV2_GroupRedeemCollateralReturn',
  'CrcV2_GroupRedeemCollateralBurn',
]);

let currentStoreUnsubscribe: (() => void) | undefined;
let currentAvatarAddress: string = '';

const _circlesBalances = writable<{
  data: TokenBalance[];
  next: () => Promise<boolean>;
  ended: boolean;
}>({ data: [], next: async () => false, ended: false });

// Strict fetch: throws on real errors so refresh callers can surface them.
// Returns [] only when the indexer explicitly reports "No balances found".
async function _fetchBalancesStrict(avatar: Avatar): Promise<TokenBalance[]> {
  if (!avatar || typeof avatar !== 'object') {
    throw new Error('Avatar is not properly initialized');
  }
  if (
    !avatar.balances ||
    typeof avatar.balances.getTokenBalances !== 'function'
  ) {
    throw new Error('Avatar balances API unavailable');
  }
  try {
    return (await avatar.balances.getTokenBalances()) as unknown as TokenBalance[];
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    if (errorMessage.includes('No balances found')) return [];
    throw e;
  }
}

// Graceful loader for boot/event paths — never throws, persists to IDB on success only.
async function _loadBalancesFor(avatar: Avatar): Promise<TokenBalance[]> {
  try {
    const balances = await _fetchBalancesStrict(avatar);
    void writeBalances(makeScopeId(avatar.address), balances as any[]);
    return balances;
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('[Balances] Error loading balances:', errorMessage);
    return [];
  }
}

export const initBalanceStore = (avatar: Avatar) => {
  // Early return if already initialized for this avatar
  if (currentAvatarAddress === avatar.address) {
    return;
  }
  currentAvatarAddress = avatar.address;

  if (currentStoreUnsubscribe) {
    currentStoreUnsubscribe();
    currentStoreUnsubscribe = undefined;
  }

  _circlesBalances.set({
    data: [],
    next: async () => false,
    ended: false,
  });

  const _initialLoad = (): Promise<TokenBalance[]> => _loadBalancesFor(avatar);

  const _handleEvent = async (
    event: CirclesEvent,
    currentData: TokenBalance[]
  ): Promise<TokenBalance[]> => {
    if (!refreshOnEvents.has(event.$event)) return currentData;
    return _loadBalancesFor(avatar);
  };

  const _handleNextPage = async (currentData: TokenBalance[]) => {
    return { data: currentData, ended: true };
  };

  const store = createEventStore<TokenBalance[]>(
    avatar,
    refreshOnEvents, // Use the provided events or an empty set
    _initialLoad, // Function to load the initial data
    _handleEvent, // Function to handle event-based updates
    _handleNextPage, // Function to handle loading the next page of data
    [], // Initial empty data
    (a, b) => {
      // Comparator to sort the data by blockNumber, transactionIndex, and logIndex
      // Order by balance desc and return 1,0,-1
      if (a.circles > b.circles) return -1;
      if (a.circles < b.circles) return 1;
      return 0;
    }
  );

  currentStoreUnsubscribe = store.subscribe(_circlesBalances.set);
};

// Re-fetch balances and patch the store in place. Does not rebuild the event
// subscription, so no empty-state flash for subscribers (e.g. totalCirclesBalance).
// Throws on RPC/network failure so the caller can surface an error instead of
// silently overwriting visible balances with an empty array.
export const refreshBalanceStore = async (avatar: Avatar): Promise<void> => {
  if (!avatar) return;
  const balances = await _fetchBalancesStrict(avatar);
  void writeBalances(makeScopeId(avatar.address), balances as any[]);
  _circlesBalances.update((s) => ({ ...s, data: balances }));
};

export const circlesBalances = _circlesBalances;
