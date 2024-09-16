<script lang="ts">
    import {avatar} from "$lib/stores/avatar";
    import {onMount} from "svelte";
    import {circlesBalances} from "$lib/stores/circlesBalances";
    import WrapCircles from "$lib/dialogs/WrapCircles.svelte";
    import type {TokenBalanceRow} from "@circles-sdk/data";
    import UnwrapCircles from "$lib/dialogs/UnwrapCircles.svelte";
    import BalanceRow from "$lib/components/BalanceRow.svelte";

    let mintableAmount: number = 0;

    onMount(async () => {
        mintableAmount = await $avatar!.getMintableAmount();
    });

    let selectedRow: TokenBalanceRow | undefined;
</script>

<div class="card bg-base-100 shadow-lg p-6">
    <div class="card-title text-2xl mb-4">Balance breakdown</div>

    {#each $circlesBalances.data as balance}
        <details class="collapse p-0 m-0 ">
            <summary class="collapse-title p-0 m-0">
                <BalanceRow balance={balance}/>
            </summary>
            <div class="collapse-content p-2">
                {#if balance.tokenType == "CrcV2_RegisterHuman" || balance.tokenType == "CrcV2_RegisterGroup" || balance.tokenType == "CrcV2_RegisterGroup"}
                    <button class="btn btn-round">
                        <img src="/banknotes.svg" alt="Wrap" class="w-6 h-6 inline"/>
                        Wrap
                    </button>
                {/if}
                {#if balance.tokenType == "CrcV1_Signup"}
                    <button class="btn btn-round">
                        <img src="/banknotes.svg" alt="Incoming trust" class="w-6 h-6 inline"/>
                        Migrate to V2
                    </button>
                {/if}
                {#if balance.tokenType == "CrcV2_ERC20WrapperDeployed_Demurraged"}
                    <button class="btn btn-round">
                        <img src="/banknotes.svg" alt="Wrap" class="w-6 h-6 inline"/>
                        Unwrap
                    </button>
                {/if}
                {#if balance.tokenType == "CrcV2_ERC20WrapperDeployed_Inflationary"}
                    <button class="btn btn-round">
                        <img src="/banknotes.svg" alt="Wrap" class="w-6 h-6 inline"/>
                        Unwrap
                    </button>
                {/if}
            </div>
        </details>

    {/each}
</div>
<WrapCircles tokenAddress={selectedRow?.tokenAddress}></WrapCircles>
<UnwrapCircles tokenAddress={selectedRow?.tokenAddress}></UnwrapCircles>
