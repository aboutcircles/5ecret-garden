<script lang="ts" context="module">
    import type {TokenType} from "@circles-sdk/data";
    import {get} from "svelte/store";
    import {totalCirclesBalance} from "$lib/stores/totalCirclesBalance";

    export function tokenTypeToString(tokenType: TokenType) {
        switch (tokenType) {
            case "CrcV2_RegisterHuman":
                return "Personal Circles";
            case "CrcV1_Signup":
                return "Personal Circles (v1)";
            case "CrcV2_ERC20WrapperDeployed_Demurraged":
                return "ERC20 Wrapper (Demurraged)";
            case "CrcV2_ERC20WrapperDeployed_Inflationary":
                return "ERC20 Wrapper (Inflationary)";
            case "CrcV2_RegisterGroup":
                return "Group Circles";
            case "TransitiveTransfer":
                return "Use all Circles";
            default:
                return tokenType;
        }
    }

    export const transitiveTransfer = () => {
        return <TokenBalanceRow>{
            tokenOwner: "0x0000000000000000000000000000000000000001",
            tokenType: "TransitiveTransfer",
            circles: get(totalCirclesBalance),
            staticCircles: 0,
            crc: 0,
            tokenAddress: "0x0000000000000000000000000000000000000000",
            tokenId: "0",
            isWrapped: false,
            isGroup: false,
            isInflationary: false,
            staticAttoCircles: "0",
            version: 0,
            attoCrc: "0",
            attoCircles: "0",
            isErc20: false,
            isErc1155: false
        };
    };
</script>
<script lang="ts">
    import type {TokenBalanceRow} from "@circles-sdk/data";
    import {createEventDispatcher} from "svelte";
    import {circlesBalances} from "$lib/stores/circlesBalances";
    import BalanceRow from "$lib/components/BalanceRow.svelte";

    export let selectedAsset: TokenBalanceRow | undefined = undefined;

    const eventDispatcher = createEventDispatcher();

    const handleSelect = (tokenBalanceRow: TokenBalanceRow) => {
        selectedAsset = tokenBalanceRow;
        eventDispatcher("select", tokenBalanceRow);
    };
</script>

<h3 class="font-bold text-lg">
    <button class="btn inline p-2" on:click={() => {
        eventDispatcher("back");
    }}>
        &lt; Back
    </button>
    Select Asset
</h3>

<div class="mt-4">
    <p class="menu-title pl-0">
        Transitive transfer
    </p>
    <div on:click={() => handleSelect(transitiveTransfer())}>
        <BalanceRow balance={transitiveTransfer()}/>
    </div>
    <p class="menu-title pl-0">
        Indivitual tokens
    </p>

    {#if $circlesBalances.data.length > 0}
        {#each $circlesBalances.data as balance (balance.tokenAddress)}
            <div on:click={() => handleSelect(balance)}>
                <BalanceRow balance={balance}/>
            </div>
        {/each}
    {:else}
        <li class="text-center py-4">No assets found</li>
    {/if}
</div>
