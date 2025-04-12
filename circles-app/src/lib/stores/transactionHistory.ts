import { avatarState } from '$lib/stores/avatar.svelte';
import {
  type CirclesEventType,
  type TransactionHistoryRow,
} from '@circles-sdk/data';
import { createCirclesQueryStore } from '$lib/stores/query/circlesQueryStore';
import { writable } from 'svelte/store';

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

const initStore = ($avatar: any) => {
  if (currentStoreUnsubscribe) {
    currentStoreUnsubscribe();
    currentStoreUnsubscribe = undefined;
  }

  currentQuery = undefined;
  transactionHistoryStore = undefined;

  if ($avatar) {
    currentQuery = createCirclesQueryStore<TransactionHistoryRow>(
      () => $avatar.getTransactionHistory(25),
      transferEvents
    );
    transactionHistoryStore = currentQuery;

    _transactionHistory.set({
      data: [],
      next: async () => false,
      ended: false,
    });
  }
};

const _transactionHistory = writable<{
  data: TransactionHistoryRow[];
  next: () => Promise<boolean>;
  ended: boolean;
}>({ data: [], next: async () => false, ended: false });

$effect(() => {
  const $avatar = avatarState.avatar;

  if ($avatar) {
    initStore($avatar);

    const thisQuery = currentQuery;
    thisQuery?.then((store) => {
      if (thisQuery === currentQuery) {
        const unsubscribe = store.subscribe((value: { data: TransactionHistoryRow[]; next: () => Promise<boolean>; ended: boolean; }) => {
          _transactionHistory.set(value);
        });
        currentStoreUnsubscribe = unsubscribe;
      }
    });
  } else {
    if (currentStoreUnsubscribe) {
      currentStoreUnsubscribe();
      currentStoreUnsubscribe = undefined;
    }
    currentQuery = undefined;
    transactionHistoryStore = undefined;
    _transactionHistory.set({
      data: [],
      next: async () => false,
      ended: true,
    });
  }
});

export const transactionHistory = _transactionHistory;
