<script lang="ts" context="module">
    // TODO: Remove this mock data and fetch the actual transaction history.
    export type TransactionHistoryRow = {
        timestamp: number;
        transactionHash: string;
        from: string;
        to: string;
        id: string;
        value: string;
        timeCircles: number;
    }
</script>
<script>
    import ActionButton from "$lib/components/ActionButton.svelte";
    import List from "$lib/components/List.svelte";
    import TransactionRow from "./components/TransactionRow.svelte";
    import {onMount} from "svelte";

    $: rows = [];

    onMount(async () => {
        // TODO: Get the list of transactions for the account.
    });

    async function mintCircles() {
        // TODO: Mint more of your personal Circles tokens.
    }
</script>

<div class="flex justify-between items-center mb-4">
    <ActionButton action={mintCircles}>
        Mint Circles
    </ActionButton>
</div>

<List rows={rows} rowComponent={TransactionRow}/>