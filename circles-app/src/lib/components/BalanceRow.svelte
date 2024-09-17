<script lang="ts">
    import Avatar from "$lib/components/Avatar.svelte";
    import {tokenTypeToString} from "$lib/flows/sendFlow/SelectAsset.svelte";
    import {crcTypes, floorToDecimals, staticTypes} from "$lib/utils/shared";
    import type {TokenBalanceRow} from "@circles-sdk/data";

    export let balance: TokenBalanceRow;
</script>
<div class="flex items-center justify-between p-2 hover:bg-base-200 rounded-lg">
    <div class="col">
        <Avatar address={balance.tokenOwner} clickable={false}>
            <span>
                {tokenTypeToString(balance.tokenType)}
            </span>
        </Avatar>
    </div>

    <div class="col text-right">
        <span class="text-lg">{floorToDecimals(balance.circles)}</span> Circles
        <p class="text-xs text-gray-500">
            {#if staticTypes.has(balance.tokenType)}
                {floorToDecimals(balance.staticCircles)} Static Circles
            {/if}
            {#if crcTypes.has(balance.tokenType)}
                {floorToDecimals(balance.crc)} CRC
            {/if}
        </p>
    </div>
</div>