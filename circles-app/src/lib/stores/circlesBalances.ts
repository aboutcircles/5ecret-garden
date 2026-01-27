import { avatarState } from '$lib/stores/avatar.svelte';
import type { CirclesEvent, CirclesEventType } from '@aboutcircles/sdk-rpc';
import type { TokenBalance } from '@aboutcircles/sdk-types';
import { createEventStore } from '$lib/stores/eventStores/eventStoreFactory.svelte';
import type { Avatar } from '@aboutcircles/sdk';
import { writable } from 'svelte/store';

const refreshOnEvents: Set<CirclesEventType> = new Set<CirclesEventType>([
  'CrcV2_TransferBatch',
  'CrcV2_TransferSingle',
  'CrcV2_Erc20WrapperTransfer',
  'CrcV2_PersonalMint',
  'CrcV2_GroupMintSingle',
  'CrcV2_GroupMintBatch',
  'CrcV2_GroupRedeem',
  'CrcV2_GroupRedeemCollateralReturn',
  'CrcV2_GroupRedeemCollateralBurn',
] as CirclesEventType[]);

let currentStoreUnsubscribe: (() => void) | undefined;
let currentAvatarAddress: string = '';

const _circlesBalances = writable<{
  data: TokenBalance[];
  next: () => Promise<boolean>;
  ended: boolean;
}>({ data: [], next: async () => false, ended: false });

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

  const _initialLoad = async (): Promise<TokenBalance[]> => {
    try {
      // Validate avatar is properly initialized
      if (!avatar || typeof avatar !== 'object') {
        console.error('[Balances] Avatar is not properly initialized:', avatar);
        return [];
      }

      // Use new SDK balances.getTokenBalances method
      if (
        !avatar.balances ||
        typeof avatar.balances.getTokenBalances !== 'function'
      ) {
        console.error(
          '[Balances] No balances.getTokenBalances method available on avatar'
        );
        return [];
      }

      const allBalances = (await avatar.balances.getTokenBalances()) as unknown as TokenBalance[];
      // Only return version 2 balances
      return allBalances.filter((balance: any) => balance.version === 2);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (errorMessage.includes('No balances found')) {
        return [];
      }
      console.error('[Balances] Error loading balances:', errorMessage);
      return [];
    }
  };

  const _handleEvent = async (
    event: CirclesEvent,
    currentData: TokenBalance[]
  ): Promise<TokenBalance[]> => {
    if (!refreshOnEvents.has(event.$event)) return currentData;
    try {
      // Use new SDK balances.getTokenBalances method
      if (
        !avatar.balances ||
        typeof avatar.balances.getTokenBalances !== 'function'
      ) {
        throw new Error('No balances.getTokenBalances method available');
      }

      const allBalances = (await avatar.balances.getTokenBalances()) as unknown as TokenBalance[];
      // Only return version 2 balances
      const v2Balances = allBalances.filter(
        (balance: any) => balance.version === 2
      );
      return v2Balances;
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (errorMessage.includes('No balances found')) {
        return [];
      }
      console.error('[Balances] Error refreshing balances:', errorMessage);
      throw new Error(`Failed to refresh balances: ${errorMessage}`);
    }
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

export const circlesBalances = _circlesBalances;
