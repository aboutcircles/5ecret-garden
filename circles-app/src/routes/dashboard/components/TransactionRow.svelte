<script lang="ts" context="module">
    export type ExtendedTransactionHistoryRow = TransactionHistoryRow & {
        isGroupMinting?: boolean;
        isPersonalMinting?: boolean;
        groupName?: string;
        groupSymbol?: string;
    };
</script>
<script lang="ts">
    import {avatar} from "$lib/stores/avatar";
    import {ZeroAddress} from "ethers";
    import type {TransactionHistoryRow} from "@circles-sdk/data";

    export let row: ExtendedTransactionHistoryRow;

    $: date = new Date(row.timestamp * 1000);
    $: sign = row.from === $avatar?.address ? "-" : "+";

    $: isIncoming = row.to === $avatar?.address;
    $: isOutgoing = row.from === $avatar?.address;
    $: isPersonalMinting = row.from === ZeroAddress && row.to === $avatar?.address && (row.tokenAddress === $avatar.avatarInfo?.tokenId || row.tokenAddress === $avatar.avatarInfo?.v1Token);
    $: isGroupMinting = row.from === ZeroAddress && row.to === $avatar?.address && !isPersonalMinting;

    $: contactAddress = isOutgoing ? row.to : row.from;
</script>
<style>
    .icon-container {
        position: relative;
        display: inline-block;
    }

    .envelope-icon {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 16px;
        height: 16px;
    }
</style>


<div class="icon-container">
    {#if isPersonalMinting}
        <img src="/logo.svg" alt="Personal token minting" class="w-12 h-12 rounded-full">
    {:else if isGroupMinting}
        <img src="/group.svg" alt="Group token minting" class="w-12 h-12 rounded-full">
    {:else if isIncoming}
        <img src="/incoming.svg" alt="Incoming transaction" class="w-12 h-12 rounded-full">
    {:else if isOutgoing}
        <img src="/outgoing.svg" alt="Outgoing transaction" class="w-12 h-12 rounded-full">
    {/if}

    {#if (isGroupMinting || isPersonalMinting) && isIncoming}
        <img src="incoming.svg" alt="Invited by me" class="envelope-icon">
    {:else if (isGroupMinting || isPersonalMinting) && isOutgoing}
        <img src="outgoing.svg" alt="Group" class="envelope-icon">
    {/if}
</div>

<div class="ml-4">
    {#if isPersonalMinting}
        <p class="text-sm">Personal token minted</p>
    {:else if isGroupMinting}
        <p class="text-sm">{row.groupSymbol ? `${row.groupSymbol} (${row.groupName})` : "Group token"} minted</p>
    {:else}
        <p class="text-sm">{contactAddress}</p>
    {/if}
    <p class="text-xs text-gray-500">{date.toLocaleDateString()} - {date.toLocaleTimeString()}</p>
</div>
<div class="ml-auto">
    <p class:text-red-500={isOutgoing} class:text-green-500={isIncoming}
       class="text-lg">{sign} {row.timeCircles}</p>
</div>