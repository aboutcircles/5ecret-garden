<script lang="ts">
    import Avatar from "$lib/components/Avatar.svelte";
    import {tokenTypeToString} from "$lib/pages/SelectAsset.svelte";
    import {crcTypes, roundToDecimals, staticTypes} from "$lib/utils/shared";
    import type {TokenBalanceRow} from "@circles-sdk/data";

    export let balance: TokenBalanceRow;
</script>
<div class="flex items-center justify-between p-2 hover:bg-base-200 rounded-lg">
    <div class="col">
        <Avatar address={balance.tokenOwner}>
            <span>
                {tokenTypeToString(balance.tokenType)}
            </span>
        </Avatar>
    </div>

    <div class="col text-right">
        <span class="text-lg">{roundToDecimals(balance.circles)}</span> Circles
        <p class="text-xs text-gray-500">
            {#if staticTypes.has(balance.tokenType)}
                {roundToDecimals(balance.staticCircles)} Static Circles
            {/if}
            {#if crcTypes.has(balance.tokenType)}
                {roundToDecimals(balance.crc)} CRC
            {/if}
        </p>
    </div>
</div>