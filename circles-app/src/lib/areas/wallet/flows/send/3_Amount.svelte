<script lang="ts">
    import type { SendFlowContext } from '$lib/areas/wallet/flows/send/context';
    import SelectAmount from '$lib/areas/wallet/ui/pages/SelectAmount.svelte';
    import Send from './4_Send.svelte';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import { SEND_FLOW_SCAFFOLD_BASE } from './constants';
    import { tick } from 'svelte';
    import { circles as circlesStore } from '$lib/shared/state/circles';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import { TransitiveTransferTokenAddress } from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
    import { ethers } from 'ethers';
    import { openStep, popToOrOpen, useAsyncAction } from '$lib/shared/flow';
    import { CirclesConverter } from '@aboutcircles/sdk-utils';
    import {MAX_PATH_STEPS} from "$lib/shared/config/circles";
    import { requireSelectedAsset } from '$lib/shared/flow';
    import type { EnterAmountStepProps } from '$lib/shared/flow';
    import { get } from 'svelte/store';
    import { popupControls } from '$lib/shared/state/popup';
    import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';
    import ToStep from './1_To.svelte';
    import TokenFiltersStep from './2_TokenFilters.svelte';
    import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
        import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
    import HelpPopover from '$lib/shared/ui/primitives/HelpPopover.svelte';
    import { SEND_POPUP_TITLE } from './constants';
    import ChangeButton from '$lib/areas/wallet/ui/components/ChangeButton.svelte';
    import { AUTO_ROUTE_HELP_LINES } from '$lib/shared/content/trustRoutingCopy';

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

    const pathfindingAction = useAsyncAction(async () => {
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
                        context.useWrappedBalances ?? true,
                        context.fromTokens,
                        context.toTokens,
                        context.excludeFromTokens,
                        context.excludeToTokens ?? excludedTokens,
                        context.maxTransfers
                    );

            if (!p || !p.transfers?.length) {
                pathfindingFailed = true;
                maxAmountCircles = 0;
                return;
            }

            if (avatarState.avatar?.avatarInfo?.version === 1) {
                const attoCircles = CirclesConverter.attoCrcToAttoCircles(
                    BigInt(p.maxFlow),
                    BigInt(Date.now() / 1000)
                );
                maxAmountCircles =
                    CirclesConverter.attoCirclesToCircles(attoCircles);
            } else {
                maxAmountCircles = parseFloat(
                    ethers.formatEther(p.maxFlow.toString())
                );
            }
        } catch (e) {
            pathfindingFailed = true;
            throw e;
        }
    });

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
        if (pathfindingAction.loading || pathfindingFailed) return false;
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
        await pathfindingAction.run();
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

    function onStepKeydown(e: KeyboardEvent) {
        if (e.key !== 'Enter') return;

        const target = e.target;
        if (!(target instanceof HTMLInputElement)) return;
        if (!target.matches('[data-send-amount-input]')) return;

        e.preventDefault();
        if (!canContinue) return;
        void handleSelect();
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
        openProfilePopup(context.selectedAddress);
    }

    function tryAnotherToken() {
        pathfindingAction.reset();
        popToOrOpen(TokenFiltersStep, {
            title: SEND_POPUP_TITLE,
            props: { context, returnMode: 'back' },
        });
    }

    function editRecipient() {
        pathfindingAction.reset();
        context.selectedAddress = undefined;
        popToOrOpen(ToStep, {
            title: SEND_POPUP_TITLE,
            props: { context },
        });
    }

    function focusRecipientSearchInputAtEnd(attempt = 0): void {
        const input = document.querySelector<HTMLInputElement>('[data-send-recipient-search-input]');
        if (input) {
            input.focus();
            const len = input.value.length;
            input.setSelectionRange?.(len, len);
            return;
        }

        if (attempt >= 4) return;
        requestAnimationFrame(() => focusRecipientSearchInputAtEnd(attempt + 1));
    }

    function onAmountBackspaceAtEmpty(): void {
        editRecipient();
        requestAnimationFrame(() => focusRecipientSearchInputAtEnd());
    }

    function focusAmountInput() {
        const amountInput = document.querySelector<HTMLInputElement>('[data-send-amount-input]');
        amountInput?.focus();
        amountInput?.select();
    }

    function applyMaxAmount(): void {
        if (!Number.isFinite(maxAmountCircles) || maxAmountCircles <= 0) return;
        context.amount = maxAmountCircles;
        amountError = false;
    }

    function pickAnotherRecipient(): void {
        editRecipient();
        requestAnimationFrame(() => focusRecipientSearchInputAtEnd());
    }

    function retryRouteCalculation(): void {
        if (!context.selectedAddress) return;
        void calculatePath();
    }

    const maxAmountText = $derived.by(() => {
        if (!Number.isFinite(maxAmountCircles) || maxAmountCircles <= 0) return null;
        return maxAmountCircles.toLocaleString(undefined, { maximumFractionDigits: 2 });
    });

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
        const fromTokensKey = (context.fromTokens ?? []).join(',');
        const toTokensKey = (context.toTokens ?? []).join(',');
        const excludeFromTokensKey = (context.excludeFromTokens ?? []).join(',');
        const excludeToTokensKey = (context.excludeToTokens ?? []).join(',');
        const useWrappedBalances = context.useWrappedBalances ?? true;

        // Keep these references in this effect so pathfinding is recalculated when filters change.
        void fromTokensKey;
        void toTokensKey;
        void excludeFromTokensKey;
        void excludeToTokensKey;
        void useWrappedBalances;

        pathfindingAction.reset();

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

<FlowStepScaffold
  {...SEND_FLOW_SCAFFOLD_BASE}
  step={2}
  title="Amount"
  onkeydown={onStepKeydown}
  role="group"
  aria-label="Send amount step"
>

    <button
        type="button"
        class="w-full text-left bg-transparent border-0 p-0"
        onclick={editRecipient}
        data-send-step-initial-focus
    >
        <RowFrame clickable={true} noLeading={true}>
            <div class="w-full flex items-center justify-between gap-3">
                <div class="min-w-0">
                    <div class="menu-title p-0">To</div>
                    <Avatar address={context.selectedAddress} clickable={true} view="horizontal" />
                </div>
                <ChangeButton />
            </div>
        </RowFrame>
    </button>

    <button
        type="button"
        class="w-full text-left bg-transparent border-0 p-0 mt-1"
        onclick={tryAnotherToken}
    >
        <RowFrame clickable={true} noLeading={true}>
            <div class="w-full flex items-center justify-between gap-3">
                <div class="min-w-0">
                    <div class="menu-title p-0">Token filters</div>
                    {#if isAutoRoute}
                        <div class="flex items-center gap-1.5">
                            <span class="font-medium">Auto route</span>
                            <HelpPopover
                                title="Auto route"
                                lines={AUTO_ROUTE_HELP_LINES}
                                widthClass="w-72"
                            />
                        </div>
                        <div class="text-xs text-base-content/70">
                            {#if context.fromTokens?.length || context.excludeFromTokens?.length}
                                Include {context.fromTokens?.length ?? 0}, exclude {context.excludeFromTokens?.length ?? 0}
                            {:else}
                                Uses default trusted token routing
                            {/if}
                        </div>
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
    </button>

    <SelectAmount
            maxAmountCircles={context.selectedAsset.isErc20
      ? context.selectedAsset.staticCircles
      : (maxAmountCircles >= 0 ? maxAmountCircles : context.selectedAsset.circles)}
            asset={context.selectedAsset}
            bind:amount={context.amount}
            routeLoading={isAutoRoute && pathfindingAction.loading}
            onBackspaceAtEmpty={onAmountBackspaceAtEmpty}
    />

    {#if pathfindingAction.error}
        <StepAlert
                variant="error"
                message={pathfindingAction.error}
        />
    {/if}

    {#if pathfindingFailed}
        <StepAlert
            variant="warning"
            className="mt-3"
            title="Route not available yet"
            message="Your current trust network cannot route this payment yet."
        >
            {#snippet action()}
                <div class="flex flex-wrap gap-2">
                    <button type="button" class="btn btn-xs btn-outline" onclick={openSelectedProfile}>Add trust</button>
                    <button type="button" class="btn btn-xs btn-ghost" onclick={pickAnotherRecipient}>Pick another recipient</button>
                </div>
            {/snippet}
        </StepAlert>
    {:else if amountError || exceedsKnownTransferLimit}
        <StepAlert
            variant="warning"
            className="mt-3"
            title="Amount exceeds route capacity"
            message={maxAmountText ? `Right now your network can route up to ${maxAmountText} Circles.` : 'Try a smaller amount or adjust the route above.'}
        >
            {#snippet action()}
                <div class="flex flex-wrap gap-2">
                    {#if maxAmountText}
                        <button type="button" class="btn btn-xs btn-outline" onclick={applyMaxAmount}>Use max ({maxAmountText})</button>
                    {/if}
                    <button type="button" class="btn btn-xs btn-ghost" onclick={focusAmountInput}>Lower amount</button>
                </div>
            {/snippet}
        </StepAlert>
    {:else if zeroAmountError}
        <StepAlert variant="warning" className="mt-3" title="Enter an amount" message="Amount must be greater than 0." />
    {:else if routeValidationError}
        <StepAlert
            variant="warning"
            className="mt-3"
            title="Route not ready"
            message="Wait for routing to finish or retry route calculation."
        >
            {#snippet action()}
                <button type="button" class="btn btn-xs btn-ghost" onclick={retryRouteCalculation}>Retry route</button>
            {/snippet}
        </StepAlert>
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

                {#if context.selectedAsset?.tokenAddress === TransitiveTransferTokenAddress && !pathfindingAction.loading}
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
    </FlowStepScaffold>
