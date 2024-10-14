<script lang="ts">
    import {avatar} from "$lib/stores/avatar";
    import {onMount} from "svelte";
    import {circlesBalances} from "$lib/stores/circlesBalances";
    import type {TokenBalanceRow} from "@circles-sdk/data";
    import BalanceRow from "$lib/components/BalanceRow.svelte";
    import {popupControls} from "$lib/components/PopUp.svelte";
    import WrapTokens from "$lib/pages/WrapTokens.svelte";
    import MigrateTokens from "$lib/pages/MigrateTokens.svelte";
    import UnwrapTokens from "$lib/pages/UnwrapTokens.svelte";
    import ExitGroup from "$lib/pages/ExitGroup.svelte";

    let mintableAmount: number = 0;

    onMount(async () => {
        mintableAmount = await $avatar!.getMintableAmount();
    });

    let selectedRow: TokenBalanceRow | undefined;
</script>

<div class="flex flex-col w-[90%] lg:w-3/5 border rounded-lg px-4 py-8 gap-y-4 mt-20">
    <div class="card-title text-2xl mb-4">Balance breakdown</div>
    {#each $circlesBalances.data as balance, i}
        <div class="collapse p-0 m-0 bg-base-100 rounded-lg">
            <input type="radio" name="balancesAccordeon" checked={i == 0}/>
            <summary class="collapse-title p-0 m-0">
                <BalanceRow balance={balance}/>
            </summary>
            <div class="collapse-content">
                {#if balance.tokenType == "CrcV2_RegisterHuman" || balance.tokenType == "CrcV2_RegisterGroup" || balance.tokenType == "CrcV2_RegisterGroup"}
                    <button class="btn btn-round" on:click={() => {
                        $popupControls.open?.({
                                title: "Wrap Circles",
                                component: WrapTokens,
                                props: {
                                    asset: balance
                                }
                            });
                        }}>
                        <img src="/banknotes.svg" alt="Wrap" class="w-6 h-6 inline"/>
                        Wrap
                    </button>
                {/if}
                {#if balance.tokenType == "CrcV2_RegisterGroup"}
                    <button class="btn btn-round" on:click={() => {
                        $popupControls.open?.({
                                title: "Exit group",
                                component: ExitGroup,
                                props: {
                                    asset: balance
                                }
                            });
                        }}>
                        <img src="/exit.svg" alt="Wrap" class="w-6 h-6 inline"/>
                        Exit
                    </button>
                {/if}
                {#if balance.tokenType == "CrcV1_Signup" && $avatar?.avatarInfo?.version > 1}
                    <button class="btn btn-round" on:click={() => {
                        $popupControls.open?.({
                                title: "Migrate Tokens to V2",
                                component: MigrateTokens,
                                props: {
                                    asset: balance
                                }
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
                                props: {
                                    asset: balance
                                }
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
                                props: {
                                    asset: balance
                                }
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