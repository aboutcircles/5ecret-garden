import {get, derived} from "svelte/store";
import type {CirclesEvent, CirclesEventType, TransactionHistoryRow} from "@circles-sdk/data";
import {avatar} from "$lib/stores/avatar";

const transferEvents: CirclesEventType[] = [
    "CrcV1_HubTransfer",
    "CrcV1_Transfer",
    "CrcV2_TransferSingle",
    "CrcV2_TransferBatch",
    "CrcV2_Erc20WrapperTransfer",
    "CrcV2_DepositInflationary",
    "CrcV2_DepositDemurraged",
    "CrcV2_WithdrawInflationary",
    "CrcV2_WithdrawDemurraged"
];
let setTransactionHistory: (txHistory: TransactionHistoryRow[]) => void;
let timeout: any;

/**
 * A store that contains the transaction history of the current avatar.
 * The transaction history is updated whenever a new transaction arrives in the event stream.
 * TODO: With the current behavior, the transaction history is fully loaded upon initialization. This should be more lazy.
 */
export const transactionHistory = derived<typeof avatar, TransactionHistoryRow[]>(avatar, ($avatar, set) => {
        setTransactionHistory = set;
        set([]);

        if (!$avatar) {
            return;
        }

        const handleEvent = async (event: CirclesEvent) => {
            if (transferEvents.indexOf(event.$event) === -1) {
                return;
            }

            if (timeout) {
                return;
            }

            timeout = setTimeout(async () => {
                try {
                    await updateTransactions();
                } catch (e) {
                    console.error(`Failed to update the transaction history on event ${event.$event}`, e);
                } finally {
                    timeout = null;
                }
            }, 100);
        };

        updateTransactions()
            .then(() => $avatar.events.subscribe(handleEvent));

        return () => {
            $avatar.unsubscribeFromEvents();
        };
    }
);

export async function updateTransactions() {
    const avatarInstance = get(avatar);
    if (!avatarInstance) {
        return;
    }

    const cachedTxHistory = get(transactionHistory);
    const txHashes = new Set(cachedTxHistory.map((tx) => tx.transactionHash));

    const updateQuery = await avatarInstance.getTransactionHistory(100);
    let newItems: TransactionHistoryRow[] = [];
    while (true) {
        const newItemsOnPage = updateQuery?.currentPage?.results.filter((tx) => !txHashes.has(tx.transactionHash));
        if (newItemsOnPage && newItemsOnPage.length > 0) {
            newItems = newItems.concat(newItemsOnPage);
            if (!await updateQuery?.queryNextPage()){
                break;
            }
        } else {
            break;
        }
    }

    insertTransactions(newItems);
}

function insertTransactions(rows: TransactionHistoryRow[]) {
    const txHistory = get(transactionHistory);
    if (!txHistory) {
        return;
    }

    const txHashes = new Set(txHistory.map((tx) => tx.transactionHash));
    const newRows = rows.filter((row) => !txHashes.has(row.transactionHash));

    if (newRows.length === 0) {
        return;
    }

    setTransactionHistory(txHistory.concat(newRows).sort((a, b) => b.timestamp - a.timestamp));
}
