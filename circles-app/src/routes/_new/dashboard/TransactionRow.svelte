<script lang="ts">
    import Avatar from "$lib/components/Avatar.svelte";
    import { getTimeAgo } from "$lib/utils/shared";
    import { floorToDecimals } from "$lib/utils/shared";
    import type { TokenType } from "@circles-sdk/data";
    import { tokenTypeToString } from "$lib/flows/sendFlow/SelectAsset.svelte";
    import { avatar } from "$lib/stores/avatar";

    export let tx: any;
    export let demurragedType: Set<TokenType>;
    export let staticTypes: Set<TokenType>;
    export let crcTypes: Set<TokenType>;
</script>

<tr>
    <td>{getTimeAgo(tx.timestamp)}</td>
    <td>
        <p class="font-semibold">
            {#if tx.from === "0x0000000000000000000000000000000000000000"}
                Mint {tokenTypeToString(tx.tokenType)}
            {:else if tx.to === "0x0000000000000000000000000000000000000000"}
                Burn
            {:else if tx.from === $avatar.address}
                <!-- from me -->
                <Avatar address={tx.to} />
            {:else if tx.to === $avatar.address}
                <!-- to me -->
                <Avatar address={tx.from} />
            {/if}
        </p>
        <p class="text-xs text-gray-500">
            <a href={"https://gnosisscan.io/tx/" + tx.transactionHash}>
                {tx.transactionHash}
            </a>
        </p>
    </td>
    <td class:text-lg={demurragedType.has(tx.tokenType)}
        class:text-red-500={demurragedType.has(tx.tokenType) && tx.from === $avatar.address}
        class:text-green-500={demurragedType.has(tx.tokenType) && tx.to === $avatar.address}>
        {floorToDecimals(tx.circles)}
    </td>
    <td class:text-lg={staticTypes.has(tx.tokenType)}
        class:text-red-500={staticTypes.has(tx.tokenType) && tx.from === $avatar.address}
        class:text-green-500={staticTypes.has(tx.tokenType) && tx.to === $avatar.address}>
        {floorToDecimals(tx.staticCircles)}
    </td>
    <td class:text-lg={crcTypes.has(tx.tokenType)}
        class:text-red-500={crcTypes.has(tx.tokenType) && tx.from === $avatar.address}
        class:text-green-500={crcTypes.has(tx.tokenType) && tx.to === $avatar.address}>
        {floorToDecimals(tx.crc)}
    </td>
    <td>
        <span class="badge badge-outline">{tx.type}</span>
        <span class="badge badge-outline">{tx.tokenType}</span>
    </td>
</tr>
