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

<tr>
    <td>{getTimeAgo(item.timestamp)}</td>
    <td>
        <p class="font-semibold">
            {#if item.from === "0x0000000000000000000000000000000000000000"}
                Mint {tokenTypeToString(item.tokenType)}
            {:else if item.to === "0x0000000000000000000000000000000000000000"}
                Burn
            {:else if item.from === $avatar.address}
                <!-- from me -->
                <Avatar address={item.to}/>
            {:else if item.to === $avatar.address}
                <!-- to me -->
                <Avatar address={item.from}/>
            {/if}
        </p>
        <p class="text-xs text-gray-500">
            <a href={"https://gnosisscan.io/tx/" + item.transactionHash}>
                {item.transactionHash}
            </a>
        </p>
    </td>
    <td class:text-lg={demurragedType.has(item.tokenType)}
        class:text-red-500={demurragedType.has(item.tokenType) && item.from === $avatar.address}
        class:text-green-500={demurragedType.has(item.tokenType) && item.to === $avatar.address}>
        {floorToDecimals(item.circles)}
    </td>
    <td class:text-lg={staticTypes.has(item.tokenType)}
        class:text-red-500={staticTypes.has(item.tokenType) && item.from === $avatar.address}
        class:text-green-500={staticTypes.has(item.tokenType) && item.to === $avatar.address}>
        {floorToDecimals(item.staticCircles)}
    </td>
    <td class:text-lg={crcTypes.has(item.tokenType)}
        class:text-red-500={crcTypes.has(item.tokenType) && item.from === $avatar.address}
        class:text-green-500={crcTypes.has(item.tokenType) && item.to === $avatar.address}>
        {floorToDecimals(item.crc)}
    </td>
    <td>
        <span class="badge badge-outline">{item.type}</span>
        <span class="badge badge-outline">{item.tokenType}</span>
    </td>
</tr>
