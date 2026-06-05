<script lang="ts">
    import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
    import { createEventDispatcher } from 'svelte';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import { tokenTypeToString } from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
    import { crcTypes, roundToDecimals, staticTypes } from '$lib/shared/utils/shared';
    import { formatCompactCurrency } from '$lib/shared/utils/money';
    import type { TokenBalance } from '@aboutcircles/sdk-types';
    import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';
    import { popupControls } from '$lib/shared/state/popup';
    import BalanceRowActions from './BalanceRowActions.svelte';
    import { isGroupTokenBalance } from '$lib/shared/utils/tokenClassification';
    import { readable } from 'svelte/store';
    import {
        formatWrappedStaticUsdPrice,
        isWrappedStaticToken,
        normalizeAddress,
        type WrappedStaticPriceMap,
    } from '$lib/shared/pricing/wrappedStaticPricing';
    import { getBalancePricingContext } from '$lib/shared/pricing/balancePricingContext';

    interface Props { item: TokenBalance; }
    let { item }: Props = $props();

    const tokenLabel = $derived.by(() => {
        // If the tokenOwner is a group, override the generic wrapper label
        if (isGroupTokenBalance(item) && !item.isGroup) {
            if (item.isErc20) return 'Group Circles (Wrapped)';
            return 'Group Circles';
        }
        return tokenTypeToString(item.tokenType ?? '');
    });

    function openActions(e: MouseEvent) {
        e.stopPropagation();
        popupControls.open({
            title: 'Token actions',
            component: BalanceRowActions,
            props: { item },
        });
    }

    const dispatch = createEventDispatcher<{ click: void }>();
    function onClick() { dispatch('click'); }

    function focusBalancesSearchInput(anchor?: HTMLElement | null): void {
        const scope = anchor?.closest<HTMLElement>('[data-balances-list-scope], [data-select-asset-list-scope]');
        const input = scope?.querySelector<HTMLInputElement>('[data-balances-search-input], [data-select-asset-search-input]')
            ?? document.querySelector<HTMLInputElement>('[data-balances-search-input], [data-select-asset-search-input]');
        input?.focus();
    }

    const listNavigator = createKeyboardListNavigator({
        getRows: (anchor) => {
            const scope = anchor?.closest<HTMLElement>('[data-balances-list-scope], [data-select-asset-list-scope]')
                ?? document.querySelector<HTMLElement>('[data-balances-list-scope], [data-select-asset-list-scope]');
            return Array.from((scope ?? document).querySelectorAll<HTMLElement>('[data-balance-row]'));
        },
        focusInput: focusBalancesSearchInput,
        onActivateRow: () => onClick(),
    });

    const pricingContext = getBalancePricingContext();
    const wrappedStaticPrices = pricingContext?.wrappedStaticPrices ?? readable<WrappedStaticPriceMap>({});

    const wrappedStaticPriceLabel = $derived.by(() => {
        if (!isWrappedStaticToken(item)) {
            return null;
        }

        const tokenAddress = normalizeAddress(item.tokenAddress);
        const price = $wrappedStaticPrices[tokenAddress]?.priceUsd ?? null;
        return formatWrappedStaticUsdPrice(price);
    });

    function onRowKeydown(event: KeyboardEvent): void {
        const target = event.target as HTMLElement | null;
        if (target?.closest('.dropdown')) {
            return;
        }
        listNavigator.onRowKeydown(event);
    }

    function onRowWrapperClick(event: MouseEvent): void {
        const target = event.target as HTMLElement | null;
        if (target?.closest('.dropdown')) {
            return;
        }
        listNavigator.onRowClick(event);
        onClick();
    }
</script>

<!-- Use noLeading to collapse the empty first column; put the old "horizontal avatar row" inside content -->
<div
    data-balance-row
    tabindex={0}
    role="button"
    aria-label={`Open actions for token ${item.tokenAddress}`}
    class="rounded-[var(--row-radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    onkeydown={onRowKeydown}
    onclick={onRowWrapperClick}
>
    <RowFrame noLeading={true} clickable={true} className="balance-row">
        <!-- CONTENT (old layout preserved) -->
        <div class="w-full flex items-center justify-between">
            <!-- Left: Avatar horizontal exactly like before -->
            <div class="min-w-0">
                <Avatar
                        placeholderBottom={true}
                        placeholderTop={false}
                        placeholderAvatar={false}
                        address={item.tokenOwner}
                        view="horizontal"
                        clickable={true}
                        bottomInfo={tokenLabel}
                />
            </div>

            <!-- Right: amount + dropdown actions -->
            <div class="flex items-center gap-3 md:gap-4 shrink-0">
                <div class="text-right tabular-nums">
                    <div class="font-medium">{formatCompactCurrency(item.circles ?? 0, 'CRC')}</div>
                    <p class="text-xs text-base-content/70">
                        {#if staticTypes.has(item.tokenType ?? '')}
                            {roundToDecimals(item.staticCircles ?? 0)} Static Circles
                        {/if}
                        {#if crcTypes.has(item.tokenType ?? '')}
                            {roundToDecimals(item.circles ?? 0)} CRC
                        {/if}
                        {#if isWrappedStaticToken(item)}
                            {#if wrappedStaticPriceLabel}
                                {' · '}{wrappedStaticPriceLabel}
                            {:else}
                                {' · '}No USD price
                            {/if}
                        {/if}
                    </p>
                </div>

                {#if !avatarState.isGroup}
                    <button
                        class="btn btn-ghost btn-xs"
                        aria-label="Token actions"
                        onclick={openActions}
                    >
                        <img src="/union.svg" alt="" class="icon" aria-hidden="true" />
                    </button>
                {/if}
            </div>
        </div>
    </RowFrame>
</div>

<style>
    /* rely on RowFrame for chrome; no extra paddings here */
</style>
