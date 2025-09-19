import { avatarState } from '$lib/stores/avatar.svelte';
import type {
  CirclesEvent,
  CirclesEventType,
  TokenBalanceRow,
} from '@circles-sdk/data';
import { createEventStore } from '$lib/stores/eventStores/eventStoreFactory.svelte';
import type { Avatar } from '@circles-sdk/sdk';
import { writable } from 'svelte/store';

const refreshOnEvents: Set<CirclesEventType> = new Set<CirclesEventType>([
  'CrcV2_TransferBatch',
  'CrcV2_TransferSingle',
  'CrcV1_HubTransfer',
  'CrcV2_Erc20WrapperTransfer',
  'CrcV1_Transfer',
  'CrcV2_GroupMintSingle',
  'CrcV2_GroupMintBatch',
  'CrcV2_GroupRedeem',
  'CrcV2_GroupRedeemCollateralReturn',
  'CrcV2_GroupRedeemCollateralBurn',
] as CirclesEventType[]);

let currentStoreUnsubscribe: (() => void) | undefined;

const _circlesBalances = writable<{
  data: TokenBalanceRow[];
  next: () => Promise<boolean>;
  ended: boolean;
}>({ data: [], next: async () => false, ended: false });

export const initBalanceStore = (avatar: Avatar) => {
  if (currentStoreUnsubscribe) {
    currentStoreUnsubscribe();
    currentStoreUnsubscribe = undefined;
  }

  _circlesBalances.set({
    data: [],
    next: async () => false,
    ended: false,
  });

  const _initialLoad = async () => {
      try {
          return await avatar.getBalances();
      } catch (e:any) {
          if (e?.includes?.("No balances found") || e?.message.includes("No balances found")) {
              return [];
          }
          throw e;
      }
  };

  const _handleEvent = async (
    event: CirclesEvent,
    currentData: TokenBalanceRow[]
  ) => {
    if (!refreshOnEvents.has(event.$event)) return currentData;
      try {
          return await avatar.getBalances();
      } catch (e:any) {
          if (e?.includes?.("No balances found") || e?.message.includes("No balances found")) {
              return [];
          }
          throw e;
      }
  };

  const _handleNextPage = async (currentData: TokenBalanceRow[]) => {
    return { data: currentData, ended: true };
  };

  const store = createEventStore<TokenBalanceRow[]>(
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