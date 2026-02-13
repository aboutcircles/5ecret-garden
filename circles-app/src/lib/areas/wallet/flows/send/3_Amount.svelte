<script lang="ts">
    import { browser } from '$app/environment';
    import type { SendFlowContext } from '$lib/areas/wallet/flows/send/context';
    import SelectAmount from '$lib/areas/wallet/ui/pages/SelectAmount.svelte';
    import Send from './4_Send.svelte';
    import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
    import {onMount, tick, untrack} from 'svelte';
    import { circles as circlesStore } from '$lib/shared/state/circles';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import { TransitiveTransferTokenAddress } from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
    import type { TokenBalanceRow } from '@circles-sdk/data';
    import { writable } from 'svelte/store';
    import { ethers } from 'ethers';
    import { openStep } from '$lib/shared/flow/runtime';
    import { CirclesConverter } from '@circles-sdk/utils';
    import {MAX_PATH_STEPS} from "$lib/shared/config/circles";
    import { requireSelectedAsset } from '$lib/shared/flow/guards';
    import type { EnterAmountStepProps } from '$lib/shared/flow/contracts';
    import { get } from 'svelte/store';
    import { popupControls } from '$lib/shared/state/popup';
    import { ProfilePopup } from '$lib/areas/profile/ui/pages';
    import SelectAsset from './2_Asset.svelte';
    import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
    import { X as LX } from 'lucide';

    type Props = EnterAmountStepProps<SendFlowContext>;

    let { context = $bindable() }: Props = $props();

    if (context.maxTransfers === undefined) {
        context.maxTransfers = MAX_PATH_STEPS;
    }

    if (context.amount === undefined) {
        context.amount = 0;
    }

    let deadBalances: TokenBalanceRow[] = $state([]);

    let showUnusedBalances = writable(false);
    let showPathsSection = $state(false); // True if pathfinding succeeds
    let pathfindingFailed = $state(false); // True if pathfinding fails
    let maxAmountCircles = $state(context.selectedAsset?.tokenAddress === TransitiveTransferTokenAddress ? -1 : context.selectedAsset?.circles ?? -1);

    // Controls displaying the data interface.
    // We'll override this in onMount if context.data is present.
    let showDataInput = $state(false);
    let showMaxAmountTip = $state(false);
    const SEND_MAX_AMOUNT_TIP_DISMISSED_KEY = 'send-max-amount-tip-dismissed-v1';
    const SEND_AMOUNT_HELP_LINES: string[] = [
        'Sending needs a trust route from you to the receiver.',
        'Your network can route only up to a certain amount right now.',
        'Try a smaller amount, another token, or strengthen trust links.',
    ];
    const SEND_MAX_AMOUNT_TIP_LINE = 'The max. amount depends on your balance, trust network and blockchain limits. Form more quality trust relations to increase your spendable amount.';

    let calculatingPath = $state(false); // Indicates pathfinding is in progress
    let amountError = $state(false);
    let pathfindingErrorRaw: string | null = $state(null);
    let showRawError = $state(false);

    const exceedsKnownTransferLimit = $derived.by(() => {
        const selectedAsset = context.selectedAsset;
        if (!selectedAsset) return false;
        const enteredAmount = Number(context.amount ?? 0);
        if (!Number.isFinite(enteredAmount) || enteredAmount <= 0) return false;

        if (selectedAsset.isErc20) {
            return enteredAmount > selectedAsset.staticCircles;
        }

        if (maxAmountCircles >= 0) {
            return enteredAmount > maxAmountCircles;
        }

        return false;
    });

    const shouldShowAmountHelp = $derived(amountError || exceedsKnownTransferLimit || pathfindingFailed);

    async function calculatePath() {
        const sdk = get(circlesStore);
        // If not transitive transfer or missing info, skip pathfinding
        if (
            context.selectedAsset?.tokenAddress != TransitiveTransferTokenAddress ||
            !sdk ||
            !avatarState.avatar ||
            !context.selectedAddress
        ) {
            return;
        }

        // Start loading
        calculatingPath = true;
        pathfindingFailed = false;
        pathfindingErrorRaw = null;
        showRawError = false;

        try {
            const excludedTokens = await sdk.getDefaultTokenExcludeList(
                context.selectedAddress
            );

            const bigNumber = '99999999999999999999999999999999999';
            const p =
                avatarState.avatar?.avatarInfo?.version === 1
                    ? await sdk.v1Pathfinder?.getPath(
                        avatarState.avatar.address,
                        context.selectedAddress,
                        bigNumber
                    )
                    : await sdk.v2Pathfinder?.getPath(
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
                pathfindingErrorRaw = 'No route found: pathfinder returned no transferable path.';
                return;
            }

            const nextPath = p;

            maxAmountCircles = parseFloat(
                ethers.formatEther(nextPath.maxFlow.toString())
            );
            if (avatarState.avatar?.avatarInfo?.version === 1) {
                const attoCircles = CirclesConverter.attoCrcToAttoCircles(BigInt(nextPath.maxFlow), BigInt(Date.now() / 1000));
                maxAmountCircles = CirclesConverter.attoCirclesToCircles(attoCircles);
                // maxAmountCircles = crcToTc(new Date(), BigInt(path.maxFlow));
            }

            // If pathfinding returned maxFlow = 0 or no meaningful transfers, treat as failure
            if (!nextPath.transfers?.length || maxAmountCircles === 0) {
                pathfindingFailed = true;
                pathfindingErrorRaw = 'No route found: path max flow is zero.';
                return;
            }

            // Otherwise, pathfinding succeeded
            showPathsSection = true;

            const balances = await avatarState.avatar.getBalances();
            const sourceEdges = nextPath.transfers.filter(
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
            pathfindingErrorRaw = err instanceof Error ? (err.stack ?? err.message) : String(err);
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

        if (!browser) return;
        const dismissedMaxTip = localStorage.getItem(SEND_MAX_AMOUNT_TIP_DISMISSED_KEY) === '1';
        showMaxAmountTip = !dismissedMaxTip;
    });

    function dismissMaxAmountTip(): void {
        showMaxAmountTip = false;
        if (browser) {
            localStorage.setItem(SEND_MAX_AMOUNT_TIP_DISMISSED_KEY, '1');
        }
    }

    async function handleSelect() {
        // Ensure all two-way bindings from CurrencyInput → SelectAmount → context are flushed
        await tick();

        // Normalize to a number (defensive)
        context.amount = Number(context.amount ?? 0);

        const selectedAsset = requireSelectedAsset(context);
        const limit = selectedAsset.isErc20
            ? selectedAsset.staticCircles
            : (maxAmountCircles >= 0 ? maxAmountCircles : (selectedAsset?.circles ?? 0));

        if (context.amount > limit) {
            amountError = true;
            return;
        }
        amountError = false;

        openStep({
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

    function openSelectedProfile() {
        if (!context.selectedAddress) return;
        popupControls.open({
            title: 'Profile',
            component: ProfilePopup,
            props: { address: context.selectedAddress },
        });
    }

    function tryAnotherToken() {
        openStep({
            title: 'Select Asset',
            component: SelectAsset,
            props: { context },
        });
    }
</script>

<FlowDecoration>

    {#if showMaxAmountTip}
        <div class="mb-4 rounded-xl border border-base-300 bg-base-100 p-3 shadow-sm">
            <div class="flex items-start justify-between gap-2">
                <div>
                    <div class="text-xs font-semibold text-base-content/70">Max amount info</div>
                    <p class="mt-1 text-xs text-base-content/80">{SEND_MAX_AMOUNT_TIP_LINE}</p>
                </div>

                <button
                        type="button"
                        class="btn btn-ghost btn-xs btn-square"
                        aria-label="Dismiss info"
                        title="Dismiss"
                        onclick={dismissMaxAmountTip}
                >
                    <Lucide icon={LX} size={14} class="text-base-content/70" ariaLabel="" />
                </button>
            </div>
        </div>
    {/if}

    {#if shouldShowAmountHelp}
        <div class="alert alert-warning py-2 text-sm mt-2">
            <div>
                <div class="font-medium">Why this transfer may fail</div>
                <ul class="mt-1 list-disc list-inside text-xs opacity-90">
                    {#each SEND_AMOUNT_HELP_LINES as line}
                        <li>{line}</li>
                    {/each}
                </ul>

                {#if pathfindingFailed}
                    <div class="mt-2 flex flex-wrap gap-2">
                        <button type="button" class="btn btn-xs btn-outline" onclick={openSelectedProfile}>View profile</button>
                        <button type="button" class="btn btn-xs btn-ghost" onclick={tryAnotherToken}>Try another token</button>
                        <button type="button" class="btn btn-xs btn-ghost" onclick={() => (showRawError = !showRawError)}>
                            {showRawError ? 'Hide error' : 'Show error'}
                        </button>
                    </div>

                    {#if showRawError}
                        <pre class="mt-2 whitespace-pre-wrap break-all text-[11px] bg-base-200/70 border border-base-300 rounded-md p-2">{pathfindingErrorRaw ?? 'No raw error available (pathfinder returned no route).'}</pre>
                    {/if}
                {/if}
            </div>
        </div>
    {/if}

    <!-- Always show the amount selection -->
    <SelectAmount
            maxAmountCircles={context.selectedAsset.isErc20
      ? context.selectedAsset.staticCircles
      : (maxAmountCircles >= 0 ? maxAmountCircles : context.selectedAsset.circles)}
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
        {#if !pathfindingFailed}
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

    {#if context.selectedAsset?.tokenAddress === TransitiveTransferTokenAddress && !calculatingPath}
        <details class="mt-4 bg-base-100 border border-base-300 rounded-xl p-3" open={pathfindingFailed ? true : undefined}>
            <summary class="cursor-pointer text-sm font-semibold">Advanced routing</summary>
            <div class="flex items-center gap-2 mt-2">
                <label for="maxTransfersAdvanced" class="text-sm font-medium whitespace-nowrap">Max. Transfers</label>
                <input
                        id="maxTransfersAdvanced"
                        type="number"
                        min="1"
                        max="1000"
                        class="input input-bordered input-sm w-20"
                        value={context.maxTransfers}
                        onblur={onMaxTransfersChange}
                        onkeydown={(e) => e.key === 'Enter' && onMaxTransfersChange(e)}
                />
            </div>
        </details>
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
