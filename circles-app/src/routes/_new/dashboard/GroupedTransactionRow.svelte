<script lang="ts">
    import Avatar from "$lib/components/Avatar.svelte";
    import {crcTypes, getTimeAgo, staticTypes} from "$lib/utils/shared";
    import {floorToDecimals} from "$lib/utils/shared";
    import {tokenTypeToString} from "$lib/pages/SelectAsset.svelte";
    import {avatar} from "$lib/stores/avatar";
    import type {GroupedTransactionHistory} from "./+page.svelte";

    export let item: GroupedTransactionHistory;
</script>

<div class="flex items-center justify-between p-2 bg-base-100 hover:bg-base-200 rounded-lg">
    <p>
        {#if item.previewRow.from === "0x0000000000000000000000000000000000000000"}
            <Avatar address={item.previewRow.to}>
                <img src="/logo.svg" alt="Incoming tokens" class="w-3 h-3 inline"/>
                <a target="_blank" href={"https://gnosisscan.io/tx/" + item.previewRow.transactionHash}
                   class="underline">
                    Mint {tokenTypeToString(item.previewRow.tokenType)}
                </a>
                <p>{getTimeAgo(item.timestamp)}</p>
            </Avatar>
        {:else if item.previewRow.to === "0x0000000000000000000000000000000000000000"}
            <Avatar address={item.previewRow.from}>
                🔥 <a target="_blank" href={"https://gnosisscan.io/tx/" + item.previewRow.transactionHash}
                     class="underline">
                Burn {tokenTypeToString(item.previewRow.tokenType)}
            </a>
                <p>{getTimeAgo(item.timestamp)}</p>
            </Avatar>
        {:else if item.previewRow.from === $avatar.address}
            <Avatar address={item.previewRow.to}>
                <img src="/outgoing.svg" alt="Outgoing tokens" class="w-3 h-3 inline"/>
                <a target="_blank" href={"https://gnosisscan.io/tx/" + item.previewRow.transactionHash}
                   class="underline">
                    Send {tokenTypeToString(item.previewRow.tokenType)}
                </a>
                <p>{getTimeAgo(item.timestamp)}</p>
            </Avatar>
        {:else if item.previewRow.to === $avatar.address}
            <Avatar address={item.previewRow.from}>
                <img src="/incoming.svg" alt="Incoming tokens" class="w-3 h-3 inline"/>
                <a target="_blank" href={"https://gnosisscan.io/tx/" + item.previewRow.transactionHash}
                   class="underline">
                    Receive {tokenTypeToString(item.previewRow.tokenType)}
                </a>
                <p>{getTimeAgo(item.timestamp)}</p>
            </Avatar>
        {/if}
    </p>

    <div class="col text-right">
        {#if item.previewRow.from === $avatar.address}
            <span class="text-lg text-red-500">-{floorToDecimals(item.previewRow.circles)}</span> Circles
        {:else}
            <span class="text-lg text-green-700">+{floorToDecimals(item.previewRow.circles)}</span> Circles
        {/if}
        <p class="text-xs text-gray-500">
            {#if staticTypes.has(item.previewRow.tokenType)}
                {floorToDecimals(item.previewRow.staticCircles)} Static Circles
            {/if}
            {#if crcTypes.has(item.previewRow.tokenType)}
                {floorToDecimals(item.previewRow.crc)} CRC
            {/if}
        </p>
    </div>
</div>
