<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import { T } from '$lib/design-system/tokens.js';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import { tokenTypeToString } from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
    import { crcTypes, roundToDecimals, staticTypes } from '$lib/shared/utils/shared';
    import { formatCompactCurrency } from '$lib/shared/utils/money';
    import WrapTokens from '$lib/areas/wallet/ui/pages/WrapTokens.svelte';
    import MigrateTokens from '$lib/areas/wallet/ui/pages/MigrateTokens.svelte';
    import UnwrapTokens from '$lib/areas/wallet/ui/pages/UnwrapTokens.svelte';
    import RedeemGroup from '$lib/areas/groups/ui/pages/RedeemGroup.svelte';
    import Send from '$lib/areas/wallet/flows/send/1_To.svelte';
    import { openStep } from '$lib/shared/flow';
    import { openSendFlowPopup } from '$lib/areas/wallet/flows/send/openSendFlowPopup';
    import type { TokenBalanceRow } from '@circles-sdk/data';
    import { circles } from '$lib/shared/state/circles';
    import { get } from 'svelte/store';
    import { formatEther } from 'ethers';
    import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';
    import { openInfoPopup } from '$lib/shared/ui/shell/confirmDialogs';
    import { openTextPromptPopup } from '$lib/shared/ui/shell/promptDialogs';
    import { runTask } from '$lib/shared/utils/tasks';
    import { readable } from 'svelte/store';
    import {
        formatWrappedStaticUsdPrice,
        isWrappedStaticToken,
        normalizeAddress,
        type WrappedStaticPriceMap,
    } from '$lib/shared/pricing/wrappedStaticPricing';
    import { getBalancePricingContext } from '$lib/shared/pricing/balancePricingContext';

    interface Props { item: TokenBalanceRow; }
    let { item }: Props = $props();

    type RowAction = {
        condition: (b: TokenBalanceRow) => boolean;
        title: string;
        icon: string;
        component: any;
    };

    const actions: RowAction[] = [
        {
            condition: (b) => true,
            title: 'Send', icon: '/send.svg', component: Send
        },
        {
            condition: (b) => ['CrcV2_RegisterHuman', 'CrcV2_RegisterGroup'].includes(b.tokenType),
            title: 'Wrap', icon: '/banknotes.svg', component: WrapTokens
        },
        {
            condition: (b) => b.tokenType === 'CrcV2_RegisterGroup',
            title: 'Redeem', icon: '/redeem.svg', component: RedeemGroup
        },
        {
            condition: (b) =>
                b.tokenType === 'CrcV1_Signup' &&
                !!avatarState.avatar?.avatarInfo &&
                avatarState.avatar?.avatarInfo?.version > 1,
            title: 'Migrate Tokens to V2', icon: '/banknotes.svg', component: MigrateTokens
        },
        {
            condition: (b) => b.tokenType === 'CrcV2_ERC20WrapperDeployed_Demurraged',
            title: 'Unwrap', icon: '/banknotes.svg', component: UnwrapTokens
        },
        {
            condition: (b) => b.tokenType === 'CrcV2_ERC20WrapperDeployed_Inflationary',
            title: 'Unwrap Static Circles', icon: '/banknotes.svg', component: UnwrapTokens
        },
    ];

    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
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

    function executeAction(action: RowAction) {
        if (action.title === 'Send') {
            openSendFlowPopup({
                selectedAsset: item,
                selectedAddress: undefined,
                amount: undefined,
                transitiveOnly: false
            });
        } else {
            openStep({ title: action.title, component: action.component, props: { asset: item } });
        }
    }

    let copyIcon = $state('/copy.svg');
    function handleCopy() {
        navigator.clipboard.writeText(item.isWrapped ? item.tokenAddress : item.tokenId);
        copyIcon = '/check.svg';
        setTimeout(() => { copyIcon = '/copy.svg'; }, 1000);
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

    async function handleReadHubBalance(): Promise<void> {
        const sdk = get(circles);
        const connectedAvatar = avatarState.avatar?.address;

        if (!sdk?.v2Hub) {
            await openInfoPopup({
                title: 'Hub unavailable',
                message: 'Circles V2 hub contract is not available.',
                tone: 'warning',
            });
            return;
        }

        if (!connectedAvatar) {
            await openInfoPopup({
                title: 'No avatar connected',
                message: 'No connected avatar found.',
                tone: 'warning',
            });
            return;
        }

        if (!item.tokenId) {
            await openInfoPopup({
                title: 'Missing token id',
                message: 'No tokenId found for this balance row.',
                tone: 'warning',
            });
            return;
        }

        try {
            const tokenId = BigInt(item.tokenId);
            const balance = await sdk.v2Hub.balanceOf(connectedAvatar, tokenId);
            await openInfoPopup({
                title: 'Circles V2 hub balance',
                message: [
                    `Avatar: ${connectedAvatar}`,
                    `Token ID: ${item.tokenId}`,
                    `Atto CRC: ${balance.toString()}`,
                    `CRC: ${formatEther(balance)}`,
                ].join('\n'),
                tone: 'info',
            });
        } catch (error: any) {
            const message = error?.message ?? 'Failed to query balance from Circles V2 hub.';
            await openInfoPopup({ title: 'Balance query failed', message, tone: 'error' });
        }
    }

    async function handleBurnFullBalance(): Promise<void> {
        const sdk = get(circles);
        const connectedAvatar = avatarState.avatar?.address;

        if (!item.isErc1155) {
            await openInfoPopup({
                title: 'Burn unavailable',
                message: 'Burn is only supported for ERC1155 balances.',
                tone: 'warning',
            });
            return;
        }

        if (!sdk?.v2Hub) {
            await openInfoPopup({
                title: 'Hub unavailable',
                message: 'Circles V2 hub contract is not available.',
                tone: 'warning',
            });
            return;
        }

        if (!connectedAvatar) {
            await openInfoPopup({
                title: 'No avatar connected',
                message: 'No connected avatar found.',
                tone: 'warning',
            });
            return;
        }

        if (!item.tokenId) {
            await openInfoPopup({
                title: 'Missing token id',
                message: 'No tokenId found for this balance row.',
                tone: 'warning',
            });
            return;
        }

        const burnAmount = BigInt(item.attoCircles ?? '0');
        if (burnAmount <= 0n) {
            await openInfoPopup({
                title: 'Nothing to burn',
                message: 'This balance has no burnable amount.',
                tone: 'warning',
            });
            return;
        }

        const confirmation = await openTextPromptPopup({
            title: 'Burn full balance',
            label: 'Type "burn burn burn" to permanently burn this token balance',
            placeholder: 'burn burn burn',
            confirmLabel: 'Burn',
            cancelLabel: 'Cancel',
            validate: (value) =>
                value.trim() === 'burn burn burn'
                    ? null
                    : 'Please type exactly: burn burn burn',
        });

        if (confirmation === null || confirmation.trim() !== 'burn burn burn') {
            return;
        }

        const tokenId = BigInt(item.tokenId);
        runTask({
            name: `Burning ${formatCompactCurrency(item.circles, 'CRC')}…`,
            promise: sdk.v2Hub.burn(tokenId, burnAmount, '0x'),
        });
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
        transition:transform .08s,background .15s,box-shadow .15s;
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
            bottomInfo={tokenTypeToString(item.tokenType)}
        />
    </div>

    <!-- Right: amount + dropdown actions -->
    <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
        <div style="text-align:right;font-variant-numeric:tabular-nums;">
            <div style="font-family:{T.fontSans};font-size:14px;font-weight:580;color:{T.ink};line-height:1.2;">{formatCompactCurrency(item.circles, 'CRC')}</div>
            <p style="margin:2px 0 0 0;font-size:10.5px;color:{T.inkMuted};">
                {#if staticTypes.has(item.tokenType)}
                    {roundToDecimals(item.staticCircles)} Static
                {/if}
                {#if crcTypes.has(item.tokenType)}
                    {roundToDecimals(item.crc)} CRC
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
            <div class="dropdown dropdown-end z-20" onclick={(e)=>e.stopPropagation()}>
                <button
                    tabindex="0"
                    style="width:30px;height:30px;border-radius:9999px;background:{T.pageDeep};color:{T.inkMuted};border:0;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;"
                    aria-label="Row actions"
                    onclick={(e)=>e.stopPropagation()}
                >
                    <img src="/union.svg" alt="" style="width:14px;height:14px;opacity:0.7;" aria-hidden="true" />
                </button>
                <ul class="dropdown-content menu menu-sm bg-base-100 rounded-box shadow z-[200] w-56 p-2" onclick={(e)=>e.stopPropagation()}>
                    {#each actions as action (action.title)}
                        {#if action.condition(item)}
                            <li>
                                <button onclick={(e)=>{ e.stopPropagation(); executeAction(action); }}>
                                    <img src={action.icon} alt="" class="icon" aria-hidden="true" />
                                    {action.title}
                                </button>
                            </li>
                        {/if}
                    {/each}
                    <li>
                        <button onclick={(e)=>{ e.stopPropagation(); handleCopy(); }}>
                            <img src={copyIcon} alt="" class="icon" aria-hidden="true" />
                            Copy
                        </button>
                    </li>
                    <li>
                        <button onclick={(e)=>{ e.stopPropagation(); void handleReadHubBalance(); }}>
                            <img src="/banknotes.svg" alt="" class="icon" aria-hidden="true" />
                            Check hub balance
                        </button>
                    </li>
                    {#if item.isErc1155}
                        <li>
                            <button onclick={(e)=>{ e.stopPropagation(); void handleBurnFullBalance(); }}>
                                <img src="/fire.svg" alt="" class="icon" aria-hidden="true" />
                                Burn
                            </button>
                        </li>
                    {/if}
                </ul>
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
