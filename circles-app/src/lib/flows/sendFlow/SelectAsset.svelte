<script lang="ts">
    import type {TokenBalanceRow} from "../../../../../../../temp/circles-sdk/packages/data/src";
    import {createEventDispatcher} from "svelte";
    import {balances} from "$lib/stores/balances";
    import Avatar from "$lib/components/Avatar.svelte";

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
        {#if $balances.length > 0}
            {#each $balances as balance (balance.tokenAddress)}
                <li class="hover:bg-base-200" on:click={() => handleSelect(balance)}>
                    <div class="flex items-center justify-between">
                        <div>
                            <p>
                                <span class="text-lg font-semibold">{balance.circles.toFixed(2)}</span>
                                <span class="text-sm text-gray-600">
                                    {#if balance.tokenType === "CrcV2_RegisterHuman"}
                                        Personal Circles
                                    {:else if balance.tokenType === "CrcV1_Signup"}
                                        Personal Circles (v1)
                                    {:else if balance.tokenType === "CrcV2_ERC20WrapperDeployed_Demurraged"}
                                        ERC20 Wrapper (Demurraged)
                                    {:else if balance.tokenType === "CrcV2_ERC20WrapperDeployed_Inflationary"}
                                        ERC20 Wrapper (Inflationary)
                                    {:else if balance.tokenType === "CrcV2_RegisterGroup"}
                                        Group Circles
                                    {/if}
                                </span>
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

<!-- Actions -->
<div class="modal-action">
    <button class="btn btn-outline">Cancel</button>
</div>
