<script lang="ts">
    import RowFrame from '$lib/shared/ui/RowFrame.svelte';
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
    import { popupControls } from '$lib/shared/state/popup';
    import type { TokenBalanceRow } from '@circles-sdk/data';

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
            popupControls.open?.({
                title: 'Send Circles',
                component: action.component,
                props: {
                    context: {
                        selectedAsset: item,
                        selectedAddress: undefined,
                        amount: undefined,
                        transitiveOnly: false
                    }
                }
            });
        } else {
            popupControls.open?.({ title: action.title, component: action.component, props: { asset: item } });
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
</script>

<!-- Use noLeading to collapse the empty first column; put the old "horizontal avatar row" inside content -->
<RowFrame noLeading={true} clickable={true} className="balance-row" onclick={onClick}>
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
                    </ul>
                </div>
            {/if}
        </div>
    </div>
</RowFrame>

<style>
    /* rely on RowFrame for chrome; no extra paddings here */
</style>
