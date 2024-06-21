<script lang="ts">
    import {avatar} from "$lib/stores/avatar";
    import {ZeroAddress} from "ethers";
    import type {TransactionHistoryRow} from "@circles-sdk/data";

    export let row: TransactionHistoryRow;

    $: date = new Date(row.timestamp * 1000);
    $: sign = row.from === $avatar?.address ? "-" : "+";

    $: isIncoming = row.to === $avatar?.address;
    $: isOutgoing = row.from === $avatar?.address;
    $: isMinting = row.from === ZeroAddress && row.to === $avatar?.address;

    $: contactAddress = isOutgoing ? row.to : row.from;
</script>

{#if isMinting}
    <img src="/logo.svg" alt="Personal token minting" class="w-12 h-12 rounded-full">
{:else if isIncoming}
    <img src="/incoming.svg" alt="Incoming transaction" class="w-12 h-12 rounded-full">
{:else if isOutgoing}
    <img src="/outgoing.svg" alt="Outgoing transaction" class="w-12 h-12 rounded-full">
{/if}
<div class="ml-4">
    <p class="text-sm">{isMinting ? "Personal token minted" : contactAddress}</p>
    <p class="text-xs text-gray-500">{date.toLocaleDateString()} - {date.toLocaleTimeString()}</p>
</div>
<div class="ml-auto">
    <p class="text-lg">{sign} {row.timeCircles}</p>
</div>