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
    import { CirclesConverter } from '@circles-sdk/utils';
    import {MAX_PATH_STEPS} from "$lib/shared/config/circles";
    import { requireSelectedAsset } from '$lib/shared/flow';
    import type { EnterAmountStepProps } from '$lib/shared/flow';
    import { get } from 'svelte/store';
    import { popupControls } from '$lib/shared/state/popup';
    import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';
    import ToStep from './1_To.svelte';
    import TokenFiltersStep from './2_TokenFilters.svelte';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
        import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
    import HelpPopover from '$lib/shared/ui/primitives/HelpPopover.svelte';
    import { SEND_POPUP_TITLE } from './constants';
    import { AUTO_ROUTE_HELP_LINES } from '$lib/shared/content/trustRoutingCopy';
    import { T } from '$lib/design-system/tokens.js';
    import Icon from '$lib/design-system/Icon.svelte';

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

    <!-- To card -->
    <button
        type="button"
        style="width:100%;text-align:left;background:transparent;border:0;padding:0;"
        onclick={editRecipient}
        data-send-step-initial-focus
    >
        <div style="
            background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;
            padding:10px 14px;box-shadow:{T.shadow.xs};
            display:flex;align-items:center;justify-content:space-between;gap:12px;
            cursor:pointer;transition:background .12s ease-out;
        ">
            <div style="min-width:0;flex:1;">
                <div style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px;">To</div>
                <Avatar address={context.selectedAddress} clickable={false} view="horizontal" />
            </div>
            <div style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:9999px;background:{T.pageDeep};color:{T.inkMuted};font-size:11px;font-weight:540;flex-shrink:0;">
                <Icon name="edit" size={10} stroke={T.inkMuted} />
                Change
            </div>
        </div>
    </button>

    <!-- Token filters card -->
    <button
        type="button"
        style="width:100%;text-align:left;background:transparent;border:0;padding:0;"
        onclick={tryAnotherToken}
    >
        <div style="
            background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;
            padding:10px 14px;box-shadow:{T.shadow.xs};
            display:flex;align-items:center;justify-content:space-between;gap:12px;
            cursor:pointer;transition:background .12s ease-out;
        ">
            <div style="min-width:0;flex:1;">
                <div style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px;">Token filters</div>
                {#if isAutoRoute}
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="font-size:13px;font-weight:540;color:{T.ink};">Auto route</span>
                        <HelpPopover title="Auto route" lines={AUTO_ROUTE_HELP_LINES} widthClass="w-72" />
                    </div>
                    <div style="font-size:11.5px;color:{T.inkMuted};margin-top:1px;">
                        {#if context.fromTokens?.length || context.excludeFromTokens?.length}
                            Include {context.fromTokens?.length ?? 0}, exclude {context.excludeFromTokens?.length ?? 0}
                        {:else}
                            Default trusted token routing
                        {/if}
                    </div>
                {:else}
                    <Avatar address={context.selectedAsset?.tokenOwner} clickable={false} view="horizontal" />
                {/if}
            </div>
            <div style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:9999px;background:{T.pageDeep};color:{T.inkMuted};font-size:11px;font-weight:540;flex-shrink:0;">
                <Icon name="edit" size={10} stroke={T.inkMuted} />
                Change
            </div>
        </div>
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
        <StepAlert variant="error" message={pathfindingAction.error} />
    {/if}

    {#if pathfindingFailed}
        <StepAlert variant="warning" title="Route not available yet" message="Your current trust network cannot route this payment yet.">
            {#snippet action()}
                <div style="display:flex;flex-wrap:wrap;gap:6px;">
                    <button type="button" style="height:28px;padding:0 12px;border-radius:9999px;border:1px solid {T.hairline};background:{T.surface};color:{T.ink};font-size:11.5px;font-weight:540;cursor:pointer;" onclick={openSelectedProfile}>Add trust</button>
                    <button type="button" style="height:28px;padding:0 12px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};font-size:11.5px;cursor:pointer;" onclick={pickAnotherRecipient}>Pick another</button>
                </div>
            {/snippet}
        </StepAlert>
    {:else if amountError || exceedsKnownTransferLimit}
        <StepAlert variant="warning" title="Amount exceeds route capacity" message={maxAmountText ? `Your network can route up to ${maxAmountText} CRC right now.` : 'Try a smaller amount or adjust the route above.'}>
            {#snippet action()}
                <div style="display:flex;flex-wrap:wrap;gap:6px;">
                    {#if maxAmountText}
                        <button type="button" style="height:28px;padding:0 12px;border-radius:9999px;border:1px solid {T.hairline};background:{T.surface};color:{T.ink};font-size:11.5px;font-weight:540;cursor:pointer;" onclick={applyMaxAmount}>Use max ({maxAmountText})</button>
                    {/if}
                    <button type="button" style="height:28px;padding:0 12px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};font-size:11.5px;cursor:pointer;" onclick={focusAmountInput}>Lower amount</button>
                </div>
            {/snippet}
        </StepAlert>
    {:else if zeroAmountError}
        <StepAlert variant="warning" title="Enter an amount" message="Amount must be greater than 0." />
    {:else if routeValidationError}
        <StepAlert variant="warning" title="Route not ready" message="Wait for routing to finish or retry.">
            {#snippet action()}
                <button type="button" style="height:28px;padding:0 12px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};font-size:11.5px;cursor:pointer;" onclick={retryRouteCalculation}>Retry route</button>
            {/snippet}
        </StepAlert>
    {/if}

    <!-- More options accordion -->
    <div style="border:1px solid {T.hairlineSoft};border-radius:14px;overflow:hidden;background:{T.surface};">
        <button
            type="button"
            style="width:100%;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;text-align:left;background:transparent;border:0;cursor:pointer;"
            aria-expanded={showMoreOptions}
            onclick={() => (showMoreOptions = !showMoreOptions)}
        >
            <div>
                <div style="font-size:13px;font-weight:540;color:{T.ink};">More options</div>
                <div style="font-size:11.5px;color:{T.inkMuted};margin-top:1px;">Add note or adjust routing</div>
            </div>
            <Icon name={showMoreOptions ? 'chevronDown' : 'chevronRight'} size={14} stroke={T.inkMuted} />
        </button>

        {#if showMoreOptions}
            <div style="padding:12px 14px;border-top:1px solid {T.hairlineSoft};display:flex;flex-direction:column;gap:14px;">
                {#if avatarState.avatar?.avatarInfo?.version === 2 && !context.selectedAsset.isErc20}
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                            <label for="dataInput" style="font-size:12.5px;font-weight:540;color:{T.ink};">Note (optional)</label>
                            <div style="display:flex;gap:4px;">
                                <button
                                    type="button"
                                    style="height:24px;padding:0 10px;border-radius:9999px;border:1px solid {context.dataType === 'utf-8' ? T.primary : T.hairline};background:{context.dataType === 'utf-8' ? T.primaryFaint : T.surface};color:{context.dataType === 'utf-8' ? T.primary : T.inkMuted};font-size:11px;font-weight:540;cursor:pointer;"
                                    onclick={() => (context.dataType = 'utf-8')}
                                >UTF-8</button>
                                <button
                                    type="button"
                                    style="height:24px;padding:0 10px;border-radius:9999px;border:1px solid {context.dataType === 'hex' ? T.primary : T.hairline};background:{context.dataType === 'hex' ? T.primaryFaint : T.surface};color:{context.dataType === 'hex' ? T.primary : T.inkMuted};font-size:11px;font-weight:540;cursor:pointer;"
                                    onclick={() => (context.dataType = 'hex')}
                                >Hex</button>
                            </div>
                        </div>
                        <textarea
                            id="dataInput"
                            style="width:100%;padding:10px 12px;border:1px solid {T.hairline};border-radius:10px;font-family:{T.fontSans};font-size:12.5px;color:{T.ink};background:{T.surfaceAlt};resize:vertical;min-height:72px;box-sizing:border-box;"
                            rows="3"
                            placeholder="Add a note for this transfer"
                            bind:value={context.data}
                        ></textarea>
                    </div>
                {/if}

                {#if context.selectedAsset?.tokenAddress === TransitiveTransferTokenAddress && !pathfindingAction.loading}
                    <div style="display:flex;flex-direction:column;gap:6px;">
                        <div style="font-size:12.5px;font-weight:540;color:{T.ink};">Advanced routing</div>
                        <div style="display:flex;align-items:center;gap:10px;">
                            <label for="maxTransfersAdvanced" style="font-size:12px;color:{T.inkMuted};white-space:nowrap;">Max. transfers</label>
                            <input
                                id="maxTransfersAdvanced"
                                type="number"
                                min="1"
                                max="1000"
                                style="width:80px;padding:6px 10px;border:1px solid {T.hairline};border-radius:8px;font-family:{T.fontSans};font-size:12.5px;color:{T.ink};background:{T.surface};"
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

    <div style="display:flex;justify-content:flex-end;margin-top:8px;">
        <button
            type="button"
            style="
                height:44px;padding:0 24px;border-radius:9999px;border:0;cursor:{canContinue ? 'pointer' : 'not-allowed'};
                background:{canContinue ? T.primary : T.pageDeep};color:{canContinue ? '#fff' : T.inkMuted};
                font-family:{T.fontSans};font-size:14px;font-weight:580;letter-spacing:-0.005em;
                box-shadow:{canContinue ? '0 4px 12px rgba(88,73,212,0.25)' : 'none'};
                transition:background .15s ease-out,box-shadow .15s ease-out;
            "
            disabled={!canContinue}
            onclick={handleSelect}
        >
            Continue
        </button>
    </div>
    </FlowStepScaffold>
