<script lang="ts">
    import type {EventRow} from "@circles-sdk/data";
    import GenericList from "$lib/components/GenericList.svelte";
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

<div class="grid grid-cols-1 mt-4">
    <TotalBalance/>
</div>

<div class="card bg-base-100 shadow-lg p-6">
    {#if txHistory}
        <GenericList row={TransactionRow}
                     store={txHistory}/>
    {/if}
</div>
