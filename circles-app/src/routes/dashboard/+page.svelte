<script lang="ts">
    import ActionButton from "$lib/components/ActionButton.svelte";
    import List from "$lib/components/List.svelte";
    import TransactionRow from "./components/TransactionRow.svelte";
    import {onMount} from "svelte";
    import {avatar} from "$lib/stores/avatar.js";
    import type {TransactionHistoryRow} from "@circles-sdk/data";

    $: rows = <TransactionHistoryRow[]>[];

    onMount(async () => {
        const result = await $avatar?.getTransactionHistory(25);
        rows = result?.currentPage?.results ?? [];
    });

    async function mintCircles() {
        await $avatar?.personalMint();
    }
</script>

<div class="flex justify-between items-center mb-4">
    <ActionButton action={mintCircles}>
        Mint Circles
    </ActionButton>
</div>

<List rows={rows} rowComponent={TransactionRow}/>