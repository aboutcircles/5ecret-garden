import {avatar} from "$lib/stores/avatar";
import {createEventStore} from "$lib/stores/eventStores/eventStoreFactory"; // Import the generic store creator
import type {CirclesEventType, TransactionHistoryRow, CirclesEvent} from "@circles-sdk/data";
import {get} from "svelte/store";

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

export function getKeyFromCirclesEvent(event: CirclesEvent): string {
    return `${event.blockNumber}-${event.transactionIndex}-${event.logIndex}`;
}

export function getKeyFromTransaction(tx: TransactionHistoryRow): string {
    return `${tx.blockNumber}-${tx.transactionIndex}-${tx.logIndex}`;
}

/**
 * Event handler for processing new transactions
 * @param event - Circles event
 * @param currentData - Current transaction history
 * @returns Updated transaction history
 */
async function handleTransactionEvent(event: CirclesEvent, currentData: TransactionHistoryRow[]): Promise<TransactionHistoryRow[]> {
    // Get the avatar instance
    const avatarInstance = get(avatar);
    if (!avatarInstance) return currentData;

    // Fetch new transactions
    const updateQuery = await avatarInstance.getTransactionHistory(100);
    const transactionKeys = new Set(currentData.map((tx) => getKeyFromTransaction(tx)));

    const newItemsOnPage = updateQuery?.currentPage?.results.filter((tx) => !transactionKeys.has(getKeyFromTransaction(tx)));
    if (newItemsOnPage && newItemsOnPage.length > 0) {
        return currentData.concat(newItemsOnPage);
    } else {
        console.log("No new items on page");
    }

    return currentData;
}

/**
 * Transaction history store, updated when relevant events occur
 */
export const transactionHistory = createEventStore<TransactionHistoryRow[]>(
    avatar,
    transferEvents,
    // Initial load function
    async () => {
        const avatarInstance = get(avatar);
        if (!avatarInstance) return [];

        // Fetch initial transactions
        const updateQuery = await avatarInstance.getTransactionHistory(100);
        return updateQuery?.currentPage?.results || [];
    },
    // Event handler (reducer-like)
    handleTransactionEvent,
    // Comparator for sorting by timestamp (most recent first)
    [], // Initial empty array for transaction history
    (a, b) => b.timestamp - a.timestamp // sort desc by timestamp
);
