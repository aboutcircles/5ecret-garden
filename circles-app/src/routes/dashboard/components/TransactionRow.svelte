<script lang="ts" context="module">
    import type {TransactionHistoryRow} from "@circles-sdk/data";
    import {type Profile as ProfileType} from "@circles-sdk/profiles";

    export type ExtendedTransactionHistoryRow = TransactionHistoryRow & {
        isGroupMinting?: boolean;
        isPersonalMinting?: boolean;
        groupName?: string;
        groupSymbol?: string;
        imageUrl?: string;
        fromProfile?: ProfileType;
        toProfile?: ProfileType;
    };
</script>
<script lang="ts">
    import {avatar} from "$lib/stores/avatar";
    import {ZeroAddress} from "ethers6";

    export let row: ExtendedTransactionHistoryRow;

    $: date = new Date(row.timestamp * 1000);
    $: sign = row.from === $avatar?.address ? "-" : "+";

    $: isIncoming = row.to === $avatar?.address;
    $: isOutgoing = row.from === $avatar?.address;
    $: isPersonalMinting =
        row.from === ZeroAddress
        && row.to === $avatar?.address
        && (row.tokenAddress === $avatar?.avatarInfo?.tokenId
            || row.tokenAddress === $avatar?.avatarInfo?.v1Token);

    $: isGroupMinting = row.from === ZeroAddress && row.to === $avatar?.address && !isPersonalMinting;
    $: contactAddress = isOutgoing ? row.to : row.from;
    $: contactProfile = isOutgoing ? row.toProfile : row.fromProfile;
</script>
<style>
    .icon-container {
        position: relative;
        display: inline-block;
    }

    .envelope-icon-large {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 32px;
        height: 32px;
        border-radius: 9999px;
    }

    .main-icon {
        position: relative;
        left: 0;
        top: 0;
        width: 3rem;
        height: 3rem;
        border-radius: 9999px;
    }
</style>


<div class="icon-container">

    {#if isPersonalMinting}
        <img src="/logo.svg" alt="Personal token minting" class="envelope-icon-large">
        <img src="/incoming.svg" alt="Invited by me" class="main-icon">
    {:else if isGroupMinting}
        {#if contactProfile?.previewImageUrl}
            <img src={contactProfile.previewImageUrl} alt="Group token minting" class="envelope-icon-large">
            <img src="incoming.svg" alt="Invited by me" class="main-icon">
        {:else}
            <img src="/group.svg" alt="Group token minting" class="main-icon">
        {/if}
    {:else if isIncoming}
        {#if contactProfile?.previewImageUrl}
            <img src={contactProfile.previewImageUrl} alt="Incoming transaction" class="envelope-icon-large">
            <img src="incoming.svg" alt="Invited by me" class="main-icon">
        {:else}
            <img src="/incoming.svg" alt="Incoming transaction" class="main-icon">
        {/if}
    {:else if isOutgoing}
        {#if contactProfile?.previewImageUrl}
            <img src={contactProfile.previewImageUrl} alt="Outgoing transaction" class="envelope-icon-large">
            <img src="outgoing.svg" alt="Group" class="main-icon">
        {:else}
            <img src="/outgoing.svg" alt="Outgoing transaction" class="main-icon">
        {/if}
    {/if}
</div>

<div class="ml-4">
    {#if isPersonalMinting}
        <p class="text-sm">Personal token minted</p>
    {:else if isGroupMinting}
        <p class="text-sm">{row.groupSymbol ? `${row.groupSymbol} (${row.groupName})` : "Group token"} minted</p>
    {:else}
        <p class="text-sm">{contactProfile?.name ?? contactAddress}{contactProfile ? " (" + contactAddress + ")" : ""}</p>
    {/if}
    <p class="text-xs text-gray-500">{date.toLocaleDateString()} - {date.toLocaleTimeString()}</p>
</div>
<div class="ml-auto">
    <p class:text-red-500={isOutgoing} class:text-green-500={isIncoming}
       class="text-lg">{sign} {row.circles?.toFixed(2)}</p>
    <p class:text-red-500={isOutgoing} class:text-green-500={isIncoming}
       class="text-lg">{sign} {(row.staticCircles * 3)?.toFixed(2)}</p>
    <p class:text-red-500={isOutgoing} class:text-green-500={isIncoming}
       class="text-lg">{sign} {row.staticCircles.toFixed(2)}</p>
</div>
<!--<pre>-->
<!--    {JSON.stringify(row ?? {}, (key, value) => {-->
<!--        // BigInt replacer:-->
<!--        if (typeof value === "bigint") {-->
<!--            return value.toString();-->
<!--        }-->
<!--        return value;-->
<!--    }, 2)}-->
<!--</pre>-->