import {avatar} from "$lib/stores/avatar";
import {type CirclesEventType, type TransactionHistoryRow} from "@circles-sdk/data";
import {get} from "svelte/store";
import {createCirclesQueryStore} from "$lib/stores/query/circlesQueryStore";
import {circles} from "$lib/stores/circles";

const transferEvents: Set<CirclesEventType> = new Set([
    "CrcV1_HubTransfer",
    "CrcV1_Transfer",
    "CrcV2_TransferSingle",
    "CrcV2_TransferBatch",
    "CrcV2_Erc20WrapperTransfer",
    "CrcV2_DepositInflationary",
    "CrcV2_DepositDemurraged",
    "CrcV2_WithdrawInflationary",
    "CrcV2_WithdrawDemurraged"
]);

const _avatar = get(avatar);
if (!_avatar) {
    throw new Error("Avatar instance not found");
}

const c = get(circles);


/**
 * Transaction history store, updated when relevant events occur.
 */
export const createTransactionHistory = async () => await createCirclesQueryStore<TransactionHistoryRow>(
    () => _avatar.getTransactionHistory(25),
    transferEvents);
