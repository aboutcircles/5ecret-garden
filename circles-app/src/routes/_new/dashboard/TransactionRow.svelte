<script lang="ts">
    import Avatar from "$lib/components/Avatar.svelte";
    import {getTimeAgo} from "$lib/utils/shared";
    import {floorToDecimals} from "$lib/utils/shared";
    import type {TokenType, TransactionHistoryRow} from "@circles-sdk/data";
    import {tokenTypeToString} from "$lib/flows/sendFlow/SelectAsset.svelte";
    import {avatar} from "$lib/stores/avatar";

    export let item: TransactionHistoryRow;

    const staticTypes: Set<TokenType> = new Set([
        "CrcV2_ERC20WrapperDeployed_Inflationary"
    ]);

    const crcTypes: Set<TokenType> = new Set([
        "CrcV1_Signup"
    ]);

    const demurragedType: Set<TokenType> = new Set([
        "CrcV2_ERC20WrapperDeployed_Demurraged",
        "CrcV2_RegisterGroup",
        "CrcV2_RegisterHuman"
    ]);
</script>

<div class="grid grid-cols-12 gap-4 p-4 bg-base-100 hover:bg-base-200 rounded-lg items-center">
    <!-- Timestamp -->
    <div class="col-span-2 text-sm text-gray-500">
        {getTimeAgo(item.timestamp)}
    </div>

    <!-- Avatar and Transaction Details -->
    <div class="col-span-4">
        <p class="font-semibold">
            {#if item.from === "0x0000000000000000000000000000000000000000"}
                Mint {tokenTypeToString(item.tokenType)}
            {:else if item.to === "0x0000000000000000000000000000000000000000"}
                Burn
            {:else if item.from === $avatar.address}
                <Avatar address={item.to} />
            {:else if item.to === $avatar.address}
                <Avatar address={item.from} />
            {/if}
        </p>
        <p class="text-xs text-gray-500 truncate">
            <a href={"https://gnosisscan.io/tx/" + item.transactionHash} class="underline">
                {item.transactionHash.slice(0, 6)}...{item.transactionHash.slice(-4)}
            </a>
        </p>
    </div>

    <!-- Circles -->
    <div class="col-span-4 text-right">
        <span class="text-lg {demurragedType.has(item.tokenType) ? 'text-red-500' : 'text-green-500'}">
            {floorToDecimals(item.circles)} Circles
        </span>
        <p class="text-xs text-gray-500">
            {floorToDecimals(item.staticCircles)} Static Circles
        </p>
    </div>

<!--    &lt;!&ndash; CRC &ndash;&gt;-->
<!--    <div class="col-span-2 text-right">-->
<!--        <span class="text-lg {crcTypes.has(item.tokenType) ? 'text-red-500' : 'text-green-500'}">-->
<!--            {floorToDecimals(item.crc)} CRC-->
<!--        </span>-->
<!--    </div>-->

    <!-- Badges -->
    <div class="col-span-2 text-right">
        <span class="badge badge-outline">{item.type}</span>
        <span class="badge badge-outline">{item.tokenType}</span>
    </div>
</div>
