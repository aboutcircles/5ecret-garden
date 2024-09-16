<script lang="ts">
    import Avatar from "$lib/components/Avatar.svelte";
    import {crcTypes, getTimeAgo, staticTypes} from "$lib/utils/shared";
    import {floorToDecimals} from "$lib/utils/shared";
    import type {TransactionHistoryRow} from "@circles-sdk/data";
    import {tokenTypeToString} from "$lib/flows/sendFlow/SelectAsset.svelte";
    import {avatar} from "$lib/stores/avatar";

    export let item: TransactionHistoryRow;
</script>

<div class="flex items-center justify-between p-2 bg-base-100 hover:bg-base-200 rounded-lg">
    <p>
        {#if item.from === "0x0000000000000000000000000000000000000000"}
            <Avatar address={item.to}>
                <img src="/logo.svg" alt="Incoming tokens" class="w-3 h-3 inline"/>
                <a target="_blank" href={"https://gnosisscan.io/tx/" + item.transactionHash} class="underline">
                    Mint {tokenTypeToString(item.tokenType)}
                </a>
                <p>{getTimeAgo(item.timestamp)}</p>
            </Avatar>
        {:else if item.to === "0x0000000000000000000000000000000000000000"}
            <Avatar address={item.from}>
                🔥 <a target="_blank" href={"https://gnosisscan.io/tx/" + item.transactionHash} class="underline">
                Burn {tokenTypeToString(item.tokenType)}
            </a>
                <p>{getTimeAgo(item.timestamp)}</p>
            </Avatar>
        {:else if item.from === $avatar.address}
            <Avatar address={item.to}>
                <img src="/outgoing.svg" alt="Outgoing tokens" class="w-3 h-3 inline"/>
                <a target="_blank" href={"https://gnosisscan.io/tx/" + item.transactionHash} class="underline">
                    Send {tokenTypeToString(item.tokenType)}
                </a>
                <p>{getTimeAgo(item.timestamp)}</p>
            </Avatar>
        {:else if item.to === $avatar.address}
            <Avatar address={item.from}>
                <img src="/incoming.svg" alt="Incoming tokens" class="w-3 h-3 inline"/>
                <a target="_blank" href={"https://gnosisscan.io/tx/" + item.transactionHash} class="underline">
                    Receive {tokenTypeToString(item.tokenType)}
                </a>
                <p>{getTimeAgo(item.timestamp)}</p>
            </Avatar>
        {/if}
    </p>

    <div class="col text-right">
        {#if item.from === $avatar.address}
            <span class="text-lg text-red-500">-{floorToDecimals(item.circles)}</span> Circles
        {:else}
            <span class="text-lg text-green-700">+{floorToDecimals(item.circles)}</span> Circles
        {/if}
        <p class="text-xs text-gray-500">
            {#if staticTypes.has(item.tokenType)}
                {floorToDecimals(item.staticCircles)} Static Circles
            {/if}
            {#if crcTypes.has(item.tokenType)}
                {floorToDecimals(item.crc)} CRC
            {/if}
        </p>
    </div>
</div>
