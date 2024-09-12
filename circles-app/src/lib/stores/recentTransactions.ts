import {writable} from "svelte/store";
import type {TransactionHistoryRow} from "@circles-sdk/data";

export const recentTransactions = writable<TransactionHistoryRow[]>();