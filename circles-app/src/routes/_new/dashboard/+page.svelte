<script lang="ts" context="module">
    import type {EventRow} from "@circles-sdk/data";

    export type GroupedTransactionHistory = EventRow & {
        timestamp: number;
        blockNumber: number;
        transactionIndex: number;
        logIndex: number;
        batchIndex: number;
        previewRow: TransactionHistoryRow;
        rows: TransactionHistoryRow[];
    };
</script>
<script lang="ts">
    import {derived, type Readable} from 'svelte/store';
    import GenericList from "$lib/components/GenericList.svelte";
    import {createTransactionHistory} from "$lib/stores/transactionHistory";
    import {onMount} from "svelte";
    import TotalBalance from "$lib/components/TotalBalance.svelte";
    import {avatar} from "$lib/stores/avatar";
    import {floorToDecimals} from "$lib/utils/shared";
    import {runTask} from "../../+layout.svelte";
    import type {TransactionHistoryRow} from "@circles-sdk/data";
    import GroupedTransactionRow from "./GroupedTransactionRow.svelte";

    let txHistory: Readable<{
        data: TransactionHistoryRow[],
        next: () => Promise<boolean>,
        ended: boolean
    }> | undefined;

    let groupedTxHistory: Readable<{
        data: GroupedTransactionHistory[],
        next: () => Promise<boolean>,
        ended: boolean
    }> | undefined;

    let mintableAmount: number = 0;

    onMount(async () => {
        txHistory = await createTransactionHistory();
        groupedTxHistory = derived(txHistory, ($txHistory) => {
            if (!$txHistory || !$txHistory.data) return {data: [], next: $txHistory?.next, ended: $txHistory?.ended};

            const groupedData = $txHistory.data.reduce((acc, tx) => {
                const {transactionHash} = tx;
                if (!acc[transactionHash]) {
                    acc[transactionHash] = [];
                }
                acc[transactionHash].push(tx);
                return acc;
            }, {} as Record<string, TransactionHistoryRow[]>);

            const groupedTxs: GroupedTransactionHistory[] = Object.entries(groupedData).map(([hash, rows]) => {
                // Sort rows by blockNumber, transactionIndex, and logIndex
                rows.sort((a, b) => {
                    if (a.blockNumber !== b.blockNumber) return a.blockNumber - b.blockNumber;
                    if (a.transactionIndex !== b.transactionIndex) return a.transactionIndex - b.transactionIndex;
                    return a.logIndex - b.logIndex;
                });

                // TODO: Select the preview row. If the tokenType is u
                let previewRow = rows.find(o => !o.tokenType);
                if (!previewRow) {
                    previewRow = rows.sort((a, b) => b.circles - a.circles)[0];
                }
                return {
                    transactionHash: hash,
                    timestamp: previewRow.timestamp,
                    blockNumber: previewRow.blockNumber,
                    transactionIndex: previewRow.transactionIndex,
                    logIndex: previewRow.logIndex,
                    batchIndex: -1, // Batch index not available, set to -1
                    previewRow,
                    rows
                };
            });

            return {
                data: groupedTxs,
                next: $txHistory.next,
                ended: $txHistory.ended
            };
        });

        mintableAmount = await $avatar?.getMintableAmount() ?? 0;
    });

    async function mintPersonalCircles() {
        if (!$avatar) {
            throw new Error("Avatar store is not available");
        }

        runTask({
            name: "Minting Circles ...",
            promise: $avatar.personalMint()
        })
            .finally(async () => {
                mintableAmount = await $avatar?.getMintableAmount() ?? 0;
            });

        mintableAmount = 0;
    }
</script>

<div class="grid grid-cols-1 mt-4">
    <TotalBalance/>
</div>

<div class="card bg-base-100 shadow-lg p-6">
    {#if mintableAmount >= 1}
        <div role="alert" class="alert mb-6 max-w-96">
            <span>You can mint {floorToDecimals(mintableAmount)} new Circles.</span>
            <div>
                <button class="btn btn-sm">Hide</button>
                <button class="btn btn-sm btn-primary" on:click={mintPersonalCircles}>Mint</button>
            </div>
        </div>
    {/if}
    <GenericList row={GroupedTransactionRow}
                 store={groupedTxHistory}/>
</div>
