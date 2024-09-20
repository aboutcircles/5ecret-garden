<script lang="ts">
    import type {EventRow} from "@circles-sdk/data";
    import GenericList from "$lib/components/GenericList.svelte";
    import {createTransactionHistory} from "$lib/stores/transactionHistory";
    import {onMount} from "svelte";
    import type {Readable} from "svelte/store";
    import TransactionRow from "./TransactionRow.svelte";
    import TotalBalance from "$lib/components/TotalBalance.svelte";
    import {avatar} from "$lib/stores/avatar";
    import {floorToDecimals} from "$lib/utils/shared";
    import {runTask} from "../../+layout.svelte";

    let txHistory: Readable<{ data: EventRow[], next: () => Promise<boolean>, ended: boolean }>
    let mintableAmount: number = 0;

    onMount(async () => {
        txHistory = await createTransactionHistory();
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
<!--                <button class="btn btn-sm">Hide</button>-->
                <button class="btn btn-sm btn-primary" on:click={mintPersonalCircles}>Mint</button>
            </div>
        </div>
    {/if}
    <GenericList row={TransactionRow}
                 store={txHistory}/>
</div>
