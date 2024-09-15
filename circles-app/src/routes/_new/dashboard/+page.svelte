<script lang="ts">
    import type {EventRow} from "@circles-sdk/data";
    import GenericList from "./GenericList.svelte";
    import {createTransactionHistory} from "$lib/stores/transactionHistory";
    import {onMount} from "svelte";
    import type {Readable} from "svelte/store";
    import TransactionRow from "./TransactionRow.svelte";
    import TotalBalance from "$lib/components/TotalBalance.svelte";

    let txHistory: Readable<{ data: EventRow[], next: () => Promise<boolean>, ended: boolean }>

    onMount(async () => {
        txHistory = await createTransactionHistory();
    });

</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <div></div>
    <TotalBalance/>
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
