<script lang="ts">
    import {balances} from "$lib/stores/balances";
    import {floorToDecimals} from "$lib/utils/shared";
    import type {EventRow} from "@circles-sdk/data";
    import GenericList from "./GenericList.svelte";
    import {createTransactionHistory} from "$lib/stores/transactionHistory";
    import {onMount} from "svelte";
    import type {Readable} from "svelte/store";
    import TransactionRow from "./TransactionRow.svelte";

    let txHistory: Readable<{ data: EventRow[], next: () => Promise<boolean>, ended: boolean }>

    onMount(async () => {
        txHistory = await createTransactionHistory();
    });

</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <div></div>
    <div class="stats text-center">
        <div class="stat">
            <a href="/_new/dashboard/balances">
                <div class="stat-value">{floorToDecimals($balances.total.circles)} Circles</div>
                <div class="stat-desc">{$balances?.rows?.length} individual tokens</div>
            </a>
        </div>
    </div>
    <div></div>
</div>

<div class="card bg-base-100 shadow-lg p-6">
    <div class="card-title text-2xl mb-4">Recent Transactions</div>

    {#if txHistory}
        <GenericList row={TransactionRow}
                     store={txHistory}/>
    {/if}

    <!--    <TransactionList />-->

</div>
