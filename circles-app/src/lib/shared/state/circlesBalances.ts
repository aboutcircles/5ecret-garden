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
let currentAvatar: Avatar | undefined;
let currentAvatarAddress: string = '';

const _circlesBalances = writable<{
  data: TokenBalance[];
  next: () => Promise<boolean>;
  ended: boolean;
}>({ data: [], next: async () => false, ended: false });

function compareBalances(a: TokenBalance, b: TokenBalance): number {
  if (a.circles > b.circles) return -1;
  if (a.circles < b.circles) return 1;
  return 0;
}

async function _loadBalancesFor(avatar: Avatar): Promise<TokenBalance[]> {
  if (!avatar || typeof avatar !== 'object') {
    console.error('[Balances] Avatar is not properly initialized:', avatar);
    return [];
  }
  if (
    !avatar.balances ||
    typeof avatar.balances.getTokenBalances !== 'function'
  ) {
    console.error(
      '[Balances] No balances.getTokenBalances method available on avatar'
    );
    return [];
  }
  try {
    const balances =
      (await avatar.balances.getTokenBalances()) as unknown as TokenBalance[];
    void writeBalances(makeScopeId(avatar.address), balances as any[]);
    return balances;
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    if (errorMessage.includes('No balances found')) return [];
    console.error('[Balances] Error loading balances:', errorMessage);
    return [];
  }
}

export const initBalanceStore = (avatar: Avatar) => {
  // Early return if already initialized for this avatar
  if (currentAvatarAddress === avatar.address) {
    currentAvatar = avatar;
    return;
  }
  currentAvatar = avatar;
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
    compareBalances
  );

  currentStoreUnsubscribe = store.subscribe(_circlesBalances.set);
};

/**
 * Force-refresh balances for the current avatar.
 * Use this after successful wallet transactions when live events are unavailable.
 */
export async function refreshBalanceStore(avatar?: Avatar): Promise<void> {
  const avatarToRefresh = avatar ?? currentAvatar;
  if (!avatarToRefresh) {
    return;
  }

  const balances = await _loadBalancesFor(avatarToRefresh);
  const sortedBalances = [...balances].sort(compareBalances);

  if (currentAvatarAddress !== avatarToRefresh.address) {
    return;
  }

  _circlesBalances.update((current) => ({
    ...current,
    data: sortedBalances,
  }));
}

export const circlesBalances = _circlesBalances;
