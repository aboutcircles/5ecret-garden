<script lang="ts">
    import ActionButton from "$lib/components/ActionButton.svelte";
    import List from "$lib/components/List.svelte";
    import TransactionRow, {type ExtendedTransactionHistoryRow} from "./components/TransactionRow.svelte";
    import {onMount} from "svelte";
    import {avatar} from "$lib/stores/avatar.js";
    import {circles} from "$lib/stores/circles";
    import {type GroupRow} from "@circles-sdk/data";

    $: rows = <ExtendedTransactionHistoryRow[]>[];
    $: personalTokenId = $avatar?.avatarInfo?.tokenId;

    async function refresh() {
        const result = await $avatar?.getTransactionHistory(1000);
        const resultRows = result?.currentPage?.results ?? [];
        const potentialGroups: Record<string, any> = {};

        rows = resultRows.map(row => {
            if (row.tokenAddress) {
                potentialGroups[row.tokenAddress] = true;
            }
            return row;
        });

        const potentialGroupAddresses = Object.keys(potentialGroups);
        if (!potentialGroupAddresses.length) {
            return;
        }
        const groupQuery = $circles?.data.findGroups(1000, {groupAddressIn: potentialGroupAddresses});
        const hasData = await groupQuery?.queryNextPage();
        if (!hasData) {
            return;
        }

        const groupRows = groupQuery?.currentPage?.results ?? [];
        const groupLookup = groupRows.reduce((acc, group) => {
            acc[group.group] = group;
            return acc;
        }, <Record<string, GroupRow>>{});

        rows = rows.map(row => {
            if (row.tokenAddress) {
                const groupRow = groupLookup[row.tokenAddress];
                const group = groupRows.find(group => group.group === row.tokenAddress);
                row.groupName = group?.name;
                row.groupSymbol = group?.symbol;
            }
            return row;
        });
    }

    onMount(() => {
        refresh();

        return $avatar?.events.subscribe(async event => {
            if (event.$event !== "CrcV1_Transfer"
                && event.$event !== "CrcV2_TransferSingle"
                && event.$event !== "CrcV2_TransferBatch") {
                return;
            }
            // TODO: Debounce. One CrcV1_HubTransfer can come with many CrcV1_Transfer events and we don't want to refresh the list for each one.
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