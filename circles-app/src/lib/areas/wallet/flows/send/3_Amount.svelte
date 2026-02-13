<script lang="ts">
    import type { SendFlowContext } from '$lib/areas/wallet/flows/send/context';
    import SelectAmount from '$lib/areas/wallet/ui/pages/SelectAmount.svelte';
    import Send from './4_Send.svelte';
    import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
    import { tick } from 'svelte';
    import { circles as circlesStore } from '$lib/shared/state/circles';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import { TransitiveTransferTokenAddress } from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
    import { ethers } from 'ethers';
    import { openStep } from '$lib/shared/flow/runtime';
    import { CirclesConverter } from '@circles-sdk/utils';
    import {MAX_PATH_STEPS} from "$lib/shared/config/circles";
    import { requireSelectedAsset } from '$lib/shared/flow/guards';
    import type { EnterAmountStepProps } from '$lib/shared/flow/contracts';
    import { get } from 'svelte/store';
    import { popupControls } from '$lib/shared/state/popup';
    import { ProfilePopup } from '$lib/areas/profile/ui/pages';
    import ToStep from './1_To.svelte';
    import SelectAsset from './2_Asset.svelte';
    import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import FlowStepHeader from '$lib/shared/ui/flow/FlowStepHeader.svelte';
    import HelpPopover from '$lib/shared/ui/primitives/HelpPopover.svelte';
    import { SEND_POPUP_TITLE } from './constants';
    import ChangeButton from '$lib/areas/wallet/ui/components/ChangeButton.svelte';

    type Props = EnterAmountStepProps<SendFlowContext>;

    let { context = $bindable() }: Props = $props();

    if (context.maxTransfers === undefined) {
        context.maxTransfers = MAX_PATH_STEPS;
    }

    if (context.amount === undefined) {
        context.amount = 0;
    }

    let pathfindingFailed = $state(false); // True if pathfinding fails
    let maxAmountCircles = $state(context.selectedAsset?.tokenAddress === TransitiveTransferTokenAddress ? -1 : context.selectedAsset?.circles ?? -1);

    let showMoreOptions = $state(false);

    let calculatingPath = $state(false); // Indicates pathfinding is in progress
    let amountError = $state(false);
    let zeroAmountError = $state(false);
    let routeValidationError = $state(false);

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

    const isAutoRoute = $derived(context.selectedAsset?.tokenAddress === TransitiveTransferTokenAddress);

    const isRouteReady = $derived.by(() => {
        if (!isAutoRoute) return true;
        if (calculatingPath || pathfindingFailed) return false;
        return maxAmountCircles > 0;
    });

    const canContinue = $derived.by(() => {
        const enteredAmount = Number(context.amount ?? 0);
        if (!Number.isFinite(enteredAmount) || enteredAmount <= 0) return false;
        if (!isRouteReady) return false;
        if (exceedsKnownTransferLimit || amountError) return false;
        return true;
    });

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
                return;
            }

        } catch (err) {
            console.error('Error fetching path:', err);
            pathfindingFailed = true;
            maxAmountCircles = -2;
        } finally {
            // End loading
            calculatingPath = false;
        }
    }

    if (!context.dataType) {
        context.dataType = 'utf-8';
    }

    async function handleSelect() {
        // Ensure all two-way bindings from CurrencyInput → SelectAmount → context are flushed
        await tick();

        // Normalize to a number (defensive)
        context.amount = Number(context.amount ?? 0);

        if (!Number.isFinite(context.amount) || context.amount <= 0) {
            zeroAmountError = true;
            routeValidationError = false;
            amountError = false;
            return;
        }
        zeroAmountError = false;

        if (!isRouteReady) {
            routeValidationError = true;
            amountError = false;
            return;
        }
        routeValidationError = false;

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
            title: SEND_POPUP_TITLE,
            component: Send,
            props: { context }
        });
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
            title: SEND_POPUP_TITLE,
            component: SelectAsset,
            props: { context, returnMode: 'back' },
        });
    }

    function editRecipient() {
        context.selectedAddress = undefined;

        const didPop = popupControls.popTo((entry) => entry.component === ToStep);
        if (!didPop) {
            openStep({
                title: SEND_POPUP_TITLE,
                component: ToStep,
                props: { context },
            });
        }
    }

    function focusAmountInput() {
        const amountInput = document.querySelector<HTMLInputElement>('[data-send-amount-input]');
        amountInput?.focus();
        amountInput?.select();
    }

    $effect(() => {
        if (Number(context.amount ?? 0) > 0) {
            zeroAmountError = false;
        }
    });

    $effect(() => {
        if (isRouteReady) {
            routeValidationError = false;
        }
    });

    $effect(() => {
        if (!exceedsKnownTransferLimit) {
            amountError = false;
        }
    });

    $effect(() => {
        const selectedAsset = context.selectedAsset;
        const selectedAddress = context.selectedAddress;

        calculatingPath = false;

        if (!selectedAsset) {
            maxAmountCircles = -1;
            pathfindingFailed = false;
            routeValidationError = false;
            return;
        }

        if (selectedAsset.tokenAddress === TransitiveTransferTokenAddress) {
            maxAmountCircles = -1;
            pathfindingFailed = false;
            routeValidationError = false;
            if (selectedAddress) {
                void calculatePath();
            }
            return;
        }

        pathfindingFailed = false;
        routeValidationError = false;
        maxAmountCircles = selectedAsset.circles ?? -1;
    });
</script>

<FlowDecoration>
    <div class="w-full space-y-4">
    <FlowStepHeader step={2} total={3} title="Amount" labels={['Recipient', 'Amount', 'Review']} />

    <RowFrame clickable={true} noLeading={true} onclick={editRecipient}>
        <div class="w-full flex items-center justify-between gap-3">
            <div class="min-w-0">
                <div class="menu-title p-0">To</div>
                <Avatar address={context.selectedAddress} clickable={true} view="horizontal" />
            </div>
            <ChangeButton />
        </div>
    </RowFrame>

    <RowFrame clickable={true} noLeading={true} onclick={tryAnotherToken} class="mt-1">
        <div class="w-full flex items-center justify-between gap-3">
            <div class="min-w-0">
                <div class="menu-title p-0">Route</div>
                {#if isAutoRoute}
                    <div class="flex items-center gap-1">
                        <span class="font-medium">Auto route</span>
                        <HelpPopover
                                title="Auto route"
                                lines={[
                                    'Uses your trust network to deliver the payment.',
                                    'Routing can change which Circles you hold — not how many.',
                                ]}
                                widthClass="w-72"
                        />
                    </div>
                    <div class="text-xs text-base-content/70">Uses your trust network</div>
                {:else}
                    <Avatar
                            address={context.selectedAsset?.tokenOwner}
                            clickable={true}
                            view="horizontal"
                    />
                {/if}
            </div>
            <ChangeButton />
        </div>
    </RowFrame>

    <SelectAmount
            maxAmountCircles={context.selectedAsset.isErc20
      ? context.selectedAsset.staticCircles
      : (maxAmountCircles >= 0 ? maxAmountCircles : context.selectedAsset.circles)}
            asset={context.selectedAsset}
            bind:amount={context.amount}
            routeLoading={isAutoRoute && calculatingPath}
    />

    {#if pathfindingFailed}
        <div class="alert alert-error py-2 text-sm mt-3">
            <div>
                <div class="font-medium">No route yet</div>
                <div class="text-xs opacity-90 mt-1">Auto route needs a trust path to this person.</div>
                <div class="mt-2 flex flex-wrap gap-2">
                    <button type="button" class="btn btn-xs btn-outline" onclick={openSelectedProfile}>View profile</button>
                </div>
            </div>
        </div>
    {:else if amountError || exceedsKnownTransferLimit}
        <div class="alert alert-warning py-2 text-sm mt-3">
            <div>
                <div class="font-medium">Amount is above current route availability</div>
                <div class="text-xs opacity-90 mt-1">Try a smaller amount or adjust the route above.</div>
                <div class="mt-2 flex flex-wrap gap-2">
                    <button type="button" class="btn btn-xs btn-ghost" onclick={focusAmountInput}>Try smaller amount</button>
                </div>
            </div>
        </div>
    {:else if zeroAmountError}
        <div class="alert alert-warning py-2 text-sm mt-3">
            <div>
                <div class="font-medium">Enter an amount</div>
                <div class="text-xs opacity-90 mt-1">Amount must be greater than 0.</div>
            </div>
        </div>
    {:else if routeValidationError}
        <div class="alert alert-warning py-2 text-sm mt-3">
            <div>
                <div class="font-medium">Route not ready</div>
                <div class="text-xs opacity-90 mt-1">Wait for routing to finish or adjust the route above.</div>
            </div>
        </div>
    {/if}

    <div class="mt-4 border border-base-300 rounded-xl overflow-hidden bg-base-100">
        <button
                type="button"
                class="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-base-200/60"
                aria-expanded={showMoreOptions}
                onclick={() => (showMoreOptions = !showMoreOptions)}
        >
            <div>
                <div class="text-sm font-semibold">More options</div>
                <div class="text-xs text-base-content/70">Add note or adjust routing</div>
            </div>
            <span class="text-base-content/70 text-sm">{showMoreOptions ? '▾' : '▸'}</span>
        </button>

        {#if showMoreOptions}
            <div class="p-3 border-t border-base-300 space-y-4">
                {#if avatarState.avatar?.avatarInfo?.version === 2 && !context.selectedAsset.isErc20}
                    <div class="space-y-2">
                        <div class="flex items-center justify-between gap-2">
                            <label for="dataInput" class="text-sm font-semibold">Note (optional)</label>
                            <div class="join">
                                <button
                                        type="button"
                                        class="btn btn-xs join-item"
                                        class:btn-primary={context.dataType === 'utf-8'}
                                        class:btn-ghost={context.dataType !== 'utf-8'}
                                        onclick={() => (context.dataType = 'utf-8')}
                                >UTF-8</button>
                                <button
                                        type="button"
                                        class="btn btn-xs join-item"
                                        class:btn-primary={context.dataType === 'hex'}
                                        class:btn-ghost={context.dataType !== 'hex'}
                                        onclick={() => (context.dataType = 'hex')}
                                >Hex</button>
                            </div>
                        </div>
                        <textarea
                                id="dataInput"
                                class="textarea textarea-bordered w-full"
                                rows="3"
                                placeholder="Add a note for this transfer"
                                bind:value={context.data}
                        ></textarea>
                    </div>
                {/if}

                {#if context.selectedAsset?.tokenAddress === TransitiveTransferTokenAddress && !calculatingPath}
                    <div class="space-y-2">
                        <div class="text-sm font-semibold">Advanced routing</div>
                        <div class="flex items-center gap-2 mt-1">
                            <label for="maxTransfersAdvanced" class="text-sm font-medium whitespace-nowrap">Max. transfers</label>
                            <input
                                    id="maxTransfersAdvanced"
                                    type="number"
                                    min="1"
                                    max="1000"
                                    class="input input-bordered input-sm w-24"
                                    value={context.maxTransfers}
                                    onblur={onMaxTransfersChange}
                                    onkeydown={(e) => e.key === 'Enter' && onMaxTransfersChange(e)}
                            />
                        </div>
                    </div>
                {/if}
            </div>
        {/if}
    </div>

    <div class="mt-6 flex justify-end">
        <button
                type="button"
                class="btn btn-primary btn-sm"
                disabled={!canContinue}
                onclick={handleSelect}
        >
            Continue
        </button>
    </div>
    </div>
</FlowDecoration>
