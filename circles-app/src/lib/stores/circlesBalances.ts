import { get } from 'svelte/store';
import { avatar } from '$lib/stores/avatar';
import type {
  CirclesEvent,
  CirclesEventType,
  TokenBalanceRow,
} from '@circles-sdk/data';
import { createEventStore } from '$lib/stores/eventStores/eventStoreFactory';

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

const _initialLoad = async () => {
  const avatarInstance = get(avatar);
  if (!avatarInstance) {
    return [];
  }

  return await avatarInstance.getBalances();
};

const _handleEvent = async (
  event: CirclesEvent,
  currentData: TokenBalanceRow[]
) => {
  if (!refreshOnEvents.has(event.$event)) {
    return currentData;
  }

  const avatarInstance = get(avatar);
  if (!avatarInstance) {
    return [];
  }

  return await avatarInstance.getBalances();
};

const _handleNextPage = async (currentData: TokenBalanceRow[]) => {
  return { data: currentData, ended: true };
};

export const circlesBalances = createEventStore<TokenBalanceRow[]>(
  avatar,
  refreshOnEvents, // Use the provided events or an empty set
  _initialLoad, // Function to load the initial data
  _handleEvent, // Function to handle event-based updates
  _handleNextPage, // Function to handle loading the next page of data
  [], // Initial empty data
  (a, b) => {
    // Comparator to sort the data by blockNumber, transactionIndex, and logIndex
    // Order by balance desc and return 1,0,-1
    if (a.circles > b.circles) {
      return -1;
    }
    if (a.circles < b.circles) {
      return 1;
    }
    return 0;
  }
);
