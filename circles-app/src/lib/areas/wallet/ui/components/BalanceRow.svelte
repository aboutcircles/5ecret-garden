<script lang="ts">
    import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
    import { createEventDispatcher } from 'svelte';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import { tokenTypeToString } from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
    import { crcTypes, roundToDecimals, staticTypes } from '$lib/shared/utils/shared';
    import WrapTokens from '$lib/areas/wallet/ui/pages/WrapTokens.svelte';
    import MigrateTokens from '$lib/areas/wallet/ui/pages/MigrateTokens.svelte';
    import UnwrapTokens from '$lib/areas/wallet/ui/pages/UnwrapTokens.svelte';
    import RedeemGroup from '$lib/areas/groups/ui/pages/RedeemGroup.svelte';
    import Send from '$lib/areas/wallet/flows/send/1_To.svelte';
    import { openStep } from '$lib/shared/flow/runtime';
    import { openSendFlowPopup } from '$lib/areas/wallet/flows/send/openSendFlowPopup';
    import type { TokenBalanceRow } from '@circles-sdk/data';
    import { circles } from '$lib/shared/state/circles';
    import { get } from 'svelte/store';
    import { formatEther } from 'ethers';
    import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';

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
        listNavigator.onRowKeydown(event);
    }

    function onRowWrapperClick(event: MouseEvent): void {
        listNavigator.onRowClick(event);
        onClick();
    }

    async function handleReadHubBalance(): Promise<void> {
        const sdk = get(circles);
        const connectedAvatar = avatarState.avatar?.address;

        if (!sdk?.v2Hub) {
            alert('Circles V2 hub contract is not available.');
            return;
        }

        if (!connectedAvatar) {
            alert('No connected avatar found.');
            return;
        }

        if (!item.tokenId) {
            alert('No tokenId found for this balance row.');
            return;
        }

        try {
            const tokenId = BigInt(item.tokenId);
            const balance = await sdk.v2Hub.balanceOf(connectedAvatar, tokenId);
            alert(
                [
                    'Circles V2 hub balance',
                    `Avatar: ${connectedAvatar}`,
                    `Token ID: ${item.tokenId}`,
                    `Atto CRC: ${balance.toString()}`,
                    `CRC: ${formatEther(balance)}`,
                ].join('\n')
            );
        } catch (error: any) {
            const message = error?.message ?? 'Failed to query balance from Circles V2 hub.';
            alert(message);
        }
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
                        bottomInfo={tokenTypeToString(item.tokenType)}
                />
            </div>

            <!-- Right: amount + dropdown actions -->
            <div class="flex items-center gap-3 md:gap-4 shrink-0">
                <div class="text-right tabular-nums">
                    <div class="font-medium">{roundToDecimals(item.circles)} CRC</div>
                    <p class="text-xs text-base-content/70">
                        {#if staticTypes.has(item.tokenType)}
                            {roundToDecimals(item.staticCircles)} Static Circles
                        {/if}
                        {#if crcTypes.has(item.tokenType)}
                            {roundToDecimals(item.crc)} CRC
                        {/if}
                    </p>
                </div>

                {#if !avatarState.isGroup}
                    <div class="dropdown dropdown-end">
                        <button tabindex="0" class="btn btn-ghost btn-xs" aria-label="Row actions" onclick={(e)=>e.stopPropagation()}>
                            <img src="/union.svg" alt="" class="icon" aria-hidden="true" />
                        </button>
                        <ul class="dropdown-content menu menu-sm bg-base-100 rounded-box shadow z-10 w-56 p-2">
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
                        </ul>
                    </div>
                {/if}
            </div>
        </div>
    </RowFrame>
</div>

<style>
    /* rely on RowFrame for chrome; no extra paddings here */
</style>
