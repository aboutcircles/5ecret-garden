<script lang="ts">
    import type { SendFlowContext } from '$lib/areas/wallet/flows/send/context';
    import SelectAmount from '$lib/areas/wallet/ui/pages/SelectAmount.svelte';
    import Send from './4_Send.svelte';
    import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
    import {onMount, tick, untrack} from 'svelte';
    import { circles } from '$lib/shared/state/circles';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import { TransitiveTransferTokenAddress } from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
    import type { TokenBalanceRow } from '@circles-sdk/data';
    import { writable } from 'svelte/store';
    import type { MaxFlowResponse } from '@circles-sdk/sdk';
    import { ethers } from 'ethers';
    import { popupControls } from '$lib/shared/state/popup';
    import { CirclesConverter } from '@circles-sdk/utils';
    import {MAX_PATH_STEPS} from "$lib/shared/config/circles";

    interface Props {
        context: SendFlowContext;
    }

    let { context = $bindable() }: Props = $props();

    if (context.maxTransfers === undefined) {
        context.maxTransfers = MAX_PATH_STEPS;
    }

    if (context.amount === undefined) {
        context.amount = 0;
    }

    let deadBalances: TokenBalanceRow[] = $state([]);
    let path: MaxFlowResponse | undefined = $state();

    let showUnusedBalances = writable(false);
    let showPathsSection = $state(false); // True if pathfinding succeeds
    let pathfindingFailed = $state(false); // True if pathfinding fails
    let maxAmountCircles = $state(-1);

    // Controls displaying the data interface.
    // We'll override this in onMount if context.data is present.
    let showDataInput = $state(false);

    let calculatingPath = $state(false); // Indicates pathfinding is in progress
    let amountError = $state(false);

    async function calculatePath() {
        // If not transitive transfer or missing info, skip pathfinding
        if (
            context.selectedAsset?.tokenAddress != TransitiveTransferTokenAddress ||
            !$circles ||
            !avatarState.avatar ||
            !context.selectedAddress
        ) {
            return;
        }

        // Start loading
        calculatingPath = true;
        pathfindingFailed = false;

        try {
            const excludedTokens = await $circles.getDefaultTokenExcludeList(
                context.selectedAddress
            );

            const bigNumber = '99999999999999999999999999999999999';
            const p =
                avatarState.avatar?.avatarInfo?.version === 1
                    ? await $circles.v1Pathfinder?.getPath(
                        avatarState.avatar.address,
                        context.selectedAddress,
                        bigNumber
                    )
                    : await $circles.v2Pathfinder?.getPath(
                        avatarState.avatar.address,
                        context.selectedAddress,
                        bigNumber,
                        true,
                        undefined,
                        undefined,
                        excludedTokens,
                        undefined,
                        context.maxTransfers
                    );

            if (!p || !p.transfers?.length) {
                pathfindingFailed = true;
                return;
            }

            path = p;

            maxAmountCircles = parseFloat(
                ethers.formatEther(path.maxFlow.toString())
            );
            if (avatarState.avatar?.avatarInfo?.version === 1) {
                const attoCircles = CirclesConverter.attoCrcToAttoCircles(BigInt(path.maxFlow), BigInt(Date.now() / 1000));
                maxAmountCircles = CirclesConverter.attoCirclesToCircles(attoCircles);
                // maxAmountCircles = crcToTc(new Date(), BigInt(path.maxFlow));
            }

            // If pathfinding returned maxFlow = 0 or no meaningful transfers, treat as failure
            if (!path.transfers?.length || maxAmountCircles === 0) {
                pathfindingFailed = true;
                return;
            }

            // Otherwise, pathfinding succeeded
            showPathsSection = true;

            const balances = await avatarState.avatar.getBalances();
            const sourceEdges = path.transfers.filter(
                (edge) => edge.from === avatarState.avatar?.address
            );

            // Identify "dead" balances not used in the path
            deadBalances = balances.filter(
                (balance) =>
                    !sourceEdges.some((edge) => edge.tokenOwner === balance.tokenAddress)
            );
        } catch (err) {
            console.error('Error fetching path:', err);
            pathfindingFailed = true;
            maxAmountCircles = -2;
        } finally {
            // End loading
            calculatingPath = false;
        }
    }

    $effect(() => {
        untrack(() => calculatePath());
    });

    onMount(async () => {
        // If context.data is already set, expand the "Attach data" area by default
        if (context.data) {
            showDataInput = true;
            // If user didn't specify a dataType, default to UTF-8
        }
        if (!context.dataType) {
            context.dataType = 'utf-8';
        }
    });

    async function handleSelect() {
        // Ensure all two-way bindings from CurrencyInput → SelectAmount → context are flushed
        await tick();

        // Normalize to a number (defensive)
        context.amount = Number(context.amount ?? 0);

        const limit = context.selectedAsset.isErc20
            ? context.selectedAsset.staticCircles
            : maxAmountCircles;

        if (context.amount > limit) {
            amountError = true;
            return;
        }
        amountError = false;

        popupControls.open({
            title: 'Send',
            component: Send,
            props: { context },
            // Optional but helpful: stable key so the same transaction step reuses the instance
            key: `send:${context.selectedAddress ?? 'na'}:${context.selectedAsset?.tokenAddress ?? 'transitive'}`
        });
    }

    function toggleUnusedBalances() {
        showUnusedBalances.update((v) => !v);
    }

    function toggleDataInput() {
        showDataInput = !showDataInput;
    }

    function onMaxTransfersChange(e: Event) {
        const target = e.target as HTMLInputElement;
        const value = parseInt(target.value);
        if (!isNaN(value) && value > 0 && value !== context.maxTransfers) {
            context.maxTransfers = value;
            calculatePath();
        }
    }
</script>

<FlowDecoration>

    <!-- Always show the amount selection -->
    <SelectAmount
            maxAmountCircles={context.selectedAsset.isErc20
      ? context.selectedAsset.staticCircles
      : maxAmountCircles}
            asset={context.selectedAsset}
            bind:amount={context.amount}
    />

    {#if amountError}
        <div class="text-error text-sm mt-1">
            The amount exceeds the maximum transferable amount.
        </div>
    {/if}

    <!-- Loading indicator while pathfinding is in progress -->
    {#if calculatingPath}
        <div class="flex items-center mt-4 space-x-2">
            <span class="loading loading-spinner"></span>
            <p class="text-base-content/70">Calculating path…</p>
        </div>
    {:else}
        <!-- Show a short message if pathfinding actually failed -->
        {#if pathfindingFailed}
            <div class="mt-4 p-2 text-error">
                <p>Pathfinding failed. No usable path was found.</p>
                {#if context.selectedAsset?.tokenAddress === TransitiveTransferTokenAddress}
                    <div class="flex items-center gap-2 mt-2">
                        <label for="maxTransfersFailed" class="text-sm font-medium whitespace-nowrap">Max. Transfers</label>
                        <input
                                id="maxTransfersFailed"
                                type="number"
                                min="1"
                                max="1000"
                                class="input input-bordered input-sm w-20"
                                value={context.maxTransfers}
                                onblur={onMaxTransfersChange}
                                onkeydown={(e) => e.key === 'Enter' && onMaxTransfersChange(e)}
                        />
                    </div>
                {/if}
            </div>
        {:else}
            <!-- Attach data + Continue -->
            <div class="mt-6 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-2">
                <div class="flex flex-row items-center gap-2">
                    {#if avatarState.avatar?.avatarInfo?.version === 2 && !context.selectedAsset.isErc20}
                        <button
                                type="button"
                                class="btn btn-outline w-full md:w-auto rounded-md"
                                onclick={toggleDataInput}
                        >
                            Attach data
                        </button>
                    {/if}
                    {#if context.selectedAsset?.tokenAddress === TransitiveTransferTokenAddress}
                        <div class="flex items-center gap-2 ml-2">
                            <label for="maxTransfers" class="text-sm font-medium whitespace-nowrap">Max. Transfers</label>
                            <input
                                    id="maxTransfers"
                                    type="number"
                                    min="1"
                                    max="1000"
                                    class="input input-bordered input-sm w-20"
                                    value={context.maxTransfers}
                                    onblur={onMaxTransfersChange}
                                    onkeydown={(e) => e.key === 'Enter' && onMaxTransfersChange(e)}
                            />
                        </div>
                    {/if}
                </div>
                <button
                        type="button"
                        class="btn btn-primary w-full md:w-auto rounded-md"
                        onclick={handleSelect}
                >
                    Continue
                </button>
            </div>
        {/if}
    {/if}

    {#if showDataInput}
        <div class="mt-4">
            <!-- One line for label + radio group -->
            <div class="flex items-center mb-2">
                <label for="dataInput" class="font-medium mr-4">Data</label>

                <label class="inline-flex items-center space-x-1 mr-4">
                    <input
                            type="radio"
                            name="dataType"
                            value="utf-8"
                            bind:group={context.dataType}
                    />
                    <span>UTF-8</span>
                </label>

                <label class="inline-flex items-center space-x-1">
                    <input
                            type="radio"
                            name="dataType"
                            value="hex"
                            bind:group={context.dataType}
                    />
                    <span>Hex</span>
                </label>
            </div>

            <!-- Textarea on its own line -->
            <textarea
                    id="dataInput"
                    class="w-full p-2 border rounded-md"
                    rows="4"
                    placeholder="Enter data here"
                    bind:value={context.data}
            ></textarea>
        </div>
    {/if}
</FlowDecoration>
