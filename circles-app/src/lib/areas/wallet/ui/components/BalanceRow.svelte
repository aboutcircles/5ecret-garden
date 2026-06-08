<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import { T } from '$lib/design-system/tokens.js';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import { tokenTypeToString } from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
    import { crcTypes, roundToDecimals } from '$lib/shared/utils/shared';
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
        if (target?.closest('[data-row-menu]')) {
            return;
        }
        listNavigator.onRowKeydown(event);
    }

    function onRowWrapperClick(event: MouseEvent): void {
        const target = event.target as HTMLElement | null;
        if (target?.closest('[data-row-menu]')) {
            return;
        }
        listNavigator.onRowClick(event);
        onClick();
    }
</script>

<div
    data-balance-row
    tabindex={0}
    role="button"
    aria-label={`Open actions for token ${item.tokenAddress}`}
    class="balance-row"
    style="
        background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;
        box-shadow:{T.shadow.xs};
        padding:10px 14px;
        display:flex;align-items:center;justify-content:space-between;gap:12px;
        cursor:pointer;outline:none;
        transition:transform .08s ease-out,background .15s ease-out,box-shadow .15s ease-out;
    "
    onkeydown={onRowKeydown}
    onclick={onRowWrapperClick}
>
    <!-- Left: Avatar -->
    <div style="min-width:0;flex:1;">
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

    <!-- Right: amount + actions -->
    <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
        <div style="text-align:right;font-variant-numeric:tabular-nums;">
            <div style="font-family:{T.fontSans};font-size:14px;font-weight:580;color:{T.ink};line-height:1.2;">{formatCompactCurrency(item.circles ?? 0, 'CRC')}</div>
            <p style="margin:2px 0 0 0;font-size:10.5px;color:{T.inkMuted};">
                {#if isWrappedStaticToken(item)}
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
            <div data-row-menu style="position:relative;z-index:20;" onclick={(e)=>e.stopPropagation()}>
                <button
                    style="width:30px;height:30px;border-radius:9999px;background:{T.pageDeep};color:{T.inkMuted};border:0;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;"
                    aria-label="Token actions"
                    onclick={openActions}
                >
                    <img src="/union.svg" alt="" style="width:14px;height:14px;opacity:0.7;" aria-hidden="true" />
                </button>
            </div>
        {/if}
    </div>
</div>

<style>
    .balance-row:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(15,10,30,0.06), 0 1px 3px rgba(15,10,30,0.04);
    }
    .balance-row:focus-visible {
        outline: 2px solid rgba(88,73,212,0.4);
        outline-offset: 2px;
    }
</style>
