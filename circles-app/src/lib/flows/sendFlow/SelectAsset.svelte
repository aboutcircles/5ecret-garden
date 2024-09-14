<script lang="ts" context="module">
    import type {TokenType} from "@circles-sdk/data";

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
            default:
                return tokenType;
        }
    }
</script>
<script lang="ts">
    import type {TokenBalanceRow} from "@circles-sdk/data";
    import {createEventDispatcher} from "svelte";
    import {balances} from "$lib/stores/balances";
    import Avatar from "$lib/components/Avatar.svelte";
    import {floorToDecimals} from "$lib/utils/shared";

    export let selectedAsset: TokenBalanceRow | undefined = undefined;

    const eventDispatcher = createEventDispatcher();

    const handleSelect = (tokenBalanceRow: TokenBalanceRow) => {
        selectedAsset = tokenBalanceRow;
        eventDispatcher("select", tokenBalanceRow);
    };
</script>

<h3 class="font-bold text-lg">Select Asset</h3>

<div class="mt-4">
    <ul class="menu bg-base-100 rounded-box w-full">
        {#if $balances.rows.length > 0}
            {#each $balances.rows as balance (balance.tokenAddress)}
                <li class="hover:bg-base-200" on:click={() => handleSelect(balance)}>
                    <div class="flex items-center justify-between">
                        <div>
                            <p>
                                <span class="text-lg font-semibold">{floorToDecimals(balance.circles)}</span>
                                <span class="text-sm text-gray-600">{tokenTypeToString(balance.tokenType)}</span>
                            </p>
                            <p class="text-gray-500 truncate">
                                <Avatar address={balance.tokenOwner}/>
                            </p>
                        </div>
                    </div>
                </li>
            {/each}
        {:else}
            <li class="text-center py-4">No assets found</li>
        {/if}
    </ul>
</div>
