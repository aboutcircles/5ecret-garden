<script lang="ts">
    import {avatar} from "$lib/stores/avatar";
    import {onMount} from "svelte";
    import {circlesBalances} from "$lib/stores/circlesBalances";
    import WrapCircles from "$lib/dialogs/WrapCircles.svelte";
    import type {TokenBalanceRow} from "@circles-sdk/data";
    import UnwrapCircles from "$lib/dialogs/UnwrapCircles.svelte";
    import BalanceRow from "$lib/components/BalanceRow.svelte";
    import {popupControls} from "$lib/components/PopUp.svelte";
    import WrapTokens from "$lib/flows/WrapTokens.svelte";
    import MigrateTokens from "$lib/flows/MigrateTokens.svelte";
    import UnwrapTokens from "$lib/flows/UnwrapTokens.svelte";

    let mintableAmount: number = 0;

    onMount(async () => {
        mintableAmount = await $avatar!.getMintableAmount();
    });

    let selectedRow: TokenBalanceRow | undefined;
</script>

<div class="card bg-base-100 shadow-lg p-6">
    <div class="card-title text-2xl mb-4">Balance breakdown</div>
    {#each $circlesBalances.data as balance, i}
        <div class="collapse p-0 m-0 bg-base-100 hover:bg-base-200 rounded-lg">
            <input type="radio" name="balancesAccordeon" checked={i == 0} />
            <summary class="collapse-title p-0 m-0">
                <BalanceRow balance={balance}/>
            </summary>
            <div class="collapse-content">
                {#if balance.tokenType == "CrcV2_RegisterHuman" || balance.tokenType == "CrcV2_RegisterGroup" || balance.tokenType == "CrcV2_RegisterGroup"}
                    <button class="btn btn-round" on:click={() => {
                        $popupControls.open?.({
                                title: "Wrap Circles",
                                component: WrapTokens,
                                props: {}
                            });
                        }}>
                        <img src="/banknotes.svg" alt="Wrap" class="w-6 h-6 inline"/>
                        Wrap
                    </button>
                {/if}
                {#if balance.tokenType == "CrcV1_Signup"}
                    <button class="btn btn-round" on:click={() => {
                        $popupControls.open?.({
                                title: "Migrate Tokens to V2",
                                component: MigrateTokens,
                                props: {}
                            });
                        }}>
                        <img src="/banknotes.svg" alt="Incoming trust" class="w-6 h-6 inline"/>
                        Migrate to V2
                    </button>
                {/if}
                {#if balance.tokenType == "CrcV2_ERC20WrapperDeployed_Demurraged"}
                    <button class="btn btn-round" on:click={() => {
                        $popupControls.open?.({
                                title: "Unwrap Circles",
                                component: UnwrapTokens,
                                props: {}
                            });
                        }}>
                        <img src="/banknotes.svg" alt="Wrap" class="w-6 h-6 inline"/>
                        Unwrap
                    </button>
                {/if}
                {#if balance.tokenType == "CrcV2_ERC20WrapperDeployed_Inflationary"}
                    <button class="btn btn-round" on:click={() => {
                        $popupControls.open?.({
                                title: "Unwrap Static Circles",
                                component: UnwrapTokens,
                                props: {}
                            });
                        }}>
                        <img src="/banknotes.svg" alt="Wrap" class="w-6 h-6 inline"/>
                        Unwrap
                    </button>
                {/if}
            </div>
        </div>

    {/each}
</div>
<WrapCircles tokenAddress={selectedRow?.tokenAddress}></WrapCircles>
<UnwrapCircles tokenAddress={selectedRow?.tokenAddress}></UnwrapCircles>
