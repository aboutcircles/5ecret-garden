import {
  type CirclesEventType,
  type TransactionHistoryRow,
} from '@circles-sdk/data';
import { createCirclesQueryStore } from '$lib/stores/query/circlesQueryStore';
import { writable } from 'svelte/store';
import type { Avatar } from '@circles-sdk/sdk';

const transferEvents: Set<CirclesEventType> = new Set([
  'CrcV1_HubTransfer',
  'CrcV1_Transfer',
  'CrcV2_TransferSingle',
  'CrcV2_TransferBatch',
  'CrcV2_Erc20WrapperTransfer',
  'CrcV2_DepositInflationary',
  'CrcV2_DepositDemurraged',
  'CrcV2_WithdrawInflationary',
  'CrcV2_WithdrawDemurraged',
  'CrcV2_GroupMintSingle',
  'CrcV2_GroupMintBatch',
  'CrcV2_GroupRedeem',
  'CrcV2_GroupRedeemCollateralReturn',
  'CrcV2_GroupRedeemCollateralBurn',
] as CirclesEventType[]);

let transactionHistoryStore:
  | ReturnType<typeof createCirclesQueryStore<TransactionHistoryRow>>
  | undefined;

let currentStoreUnsubscribe: (() => void) | undefined;
let currentQuery: Promise<any> | undefined;

const _transactionHistory = writable<{
  data: TransactionHistoryRow[];
  next: () => Promise<boolean>;
  ended: boolean;
}>({ data: [], next: async () => false, ended: false });

export const initTransactionHistoryStore = (avatar: Avatar) => {
  if (currentStoreUnsubscribe) {
    currentStoreUnsubscribe();
    currentStoreUnsubscribe = undefined;
  }

  currentQuery = undefined;
  transactionHistoryStore = undefined;

  currentQuery = createCirclesQueryStore<TransactionHistoryRow>(
    avatar,
    () => avatar.getTransactionHistory(25),
    transferEvents
  );
  transactionHistoryStore = currentQuery;

  _transactionHistory.set({
    data: [],
    next: async () => false,
    ended: false,
  });

  const thisQuery = currentQuery;
  thisQuery?.then((store) => {
    if (thisQuery === currentQuery) {
      const unsubscribe = store.subscribe(
        (value: {
          data: TransactionHistoryRow[];
          next: () => Promise<boolean>;
          ended: boolean;
        }) => {
          _transactionHistory.set(value);
        }
      );
      currentStoreUnsubscribe = unsubscribe;
    }
  });
};

export const transactionHistory = _transactionHistory;
