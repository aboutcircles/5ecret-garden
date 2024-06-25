<script lang="ts">
    import ActionButton from "$lib/components/ActionButton.svelte";
    import List from "$lib/components/List.svelte";
    import TransactionRow from "./components/TransactionRow.svelte";
    import {onMount} from "svelte";
    import {avatar} from "$lib/stores/avatar.js";
    import type {TransactionHistoryRow} from "@circles-sdk/data";

    $: rows = <TransactionHistoryRow[]>[];

    async function refresh() {
        const result = await $avatar?.getTransactionHistory(25)
        rows = result?.currentPage?.results ?? [];
    }

    onMount(() => {
        refresh();

        return $avatar?.events.subscribe(async event => {
            if (event.$event !== "CrcV1_Transfer"
                && event.$event !== "CrcV2_TransferSingle"
                && event.$event !== "CrcV2_TransferBatch") {
                return;
            }
            // TODO: Debounce. Once CrcV1_HubTransfer can come with many CrcV1_Transfer events and we don't want to refresh the list for each one.
            await refresh();
        });
    });

    async function mintCircles() {
        await $avatar?.personalMint();
    }
</script>

<div class="flex justify-between items-center mb-4">
    {#if $avatar?.avatarInfo?.type === "human"}
        <ActionButton action={mintCircles}>
            Mint Circles
        </ActionButton>
    {/if}
</div>

<List rows={rows} rowComponent={TransactionRow}/>