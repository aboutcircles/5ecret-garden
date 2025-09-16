<script lang="ts">
    import {tokenTypeToString} from '$lib/pages/SelectAsset.svelte';
    import {avatarState} from '$lib/stores/avatar.svelte';
    import {crcTypes, getTimeAgo, roundToDecimals, staticTypes} from '$lib/utils/shared';
    import type {TokenBalanceRow} from '@circles-sdk/data';
    import WrapTokens from '$lib/pages/WrapTokens.svelte';
    import MigrateTokens from '$lib/pages/MigrateTokens.svelte';
    import UnwrapTokens from '$lib/pages/UnwrapTokens.svelte';
    import RedeemGroup from '$lib/pages/RedeemGroup.svelte';
    import Avatar from './avatar/Avatar.svelte';
    import {popupControls} from '$lib/stores/popUp';

    interface Props {
        item: TokenBalanceRow;
    }

    let {item}: Props = $props();

    interface Props { item: TokenBalanceRow }

    const actions = [
        {
            condition: (b: TokenBalanceRow) => ['CrcV2_RegisterHuman', 'CrcV2_RegisterGroup'].includes(b.tokenType),
            title: 'Wrap', icon: '/banknotes.svg', component: WrapTokens
        },
        {
            condition: (b: TokenBalanceRow) => b.tokenType === 'CrcV2_RegisterGroup',
            title: 'Redeem', icon: '/redeem.svg', component: RedeemGroup
        },
        {
            condition: (b: TokenBalanceRow) => b.tokenType === 'CrcV1_Signup' && !!avatarState.avatar?.avatarInfo && avatarState.avatar?.avatarInfo?.version > 1,
            title: 'Migrate Tokens to V2', icon: '/banknotes.svg', component: MigrateTokens
        },
        {
            condition: (b: TokenBalanceRow) => b.tokenType === 'CrcV2_ERC20WrapperDeployed_Demurraged',
            title: 'Unwrap', icon: '/banknotes.svg', component: UnwrapTokens
        },
        {
            condition: (b: TokenBalanceRow) => b.tokenType === 'CrcV2_ERC20WrapperDeployed_Inflationary',
            title: 'Unwrap Static Circles', icon: '/banknotes.svg', component: UnwrapTokens
        },
    ];

    function executeAction(action: {
        condition: (b: TokenBalanceRow) => boolean;
        title: string;
        icon: string;
        component: any;
    }) {
        popupControls.open?.({title: action.title, component: action.component, props: {asset: item}});
    }

    let copyIcon = $state('/copy.svg');

    function handleCopy() {
        navigator.clipboard.writeText(item.isWrapped ? item.tokenAddress : item.tokenId);
        copyIcon = '/check.svg';
        setTimeout(() => {
            copyIcon = '/copy.svg';
        }, 1000);
    }
</script>

<div class="w-full">
    <div class="flex items-center justify-between px-3 py-2 hover:bg-base-200 rounded-lg">
        <Avatar
                placeholderBottom={true}
                placeholderTop={false}
                placeholderAvatar={false}
                address={item.tokenOwner}
                view="horizontal"
                clickable={true}
                bottomInfo={tokenTypeToString(item.tokenType)}
        />

        <div class="flex items-center gap-3 md:gap-4">
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
                    <button tabindex="0" class="btn btn-ghost btn-xs" aria-label="Row actions">
                        <img src="/union.svg" alt="" class="icon" aria-hidden="true"/>
                    </button>
                    <ul tabindex="0" class="dropdown-content menu menu-sm bg-base-100 rounded-box shadow z-10 w-56 p-2">
                        {#each actions as action (action.title)}
                            {#if action.condition(item)}
                                <li>
                                    <button onclick={() => executeAction(action)}>
                                        <img src={action.icon} alt="" class="icon" aria-hidden="true"/>
                                        {action.title}
                                    </button>
                                </li>
                            {/if}
                        {/each}
                        <li>
                            <button onclick={handleCopy}>
                                <img src={copyIcon} alt="" class="icon" aria-hidden="true"/>
                                Copy
                            </button>
                        </li>
                    </ul>
                </div>
            {/if}
        </div>
    </div>
</div>