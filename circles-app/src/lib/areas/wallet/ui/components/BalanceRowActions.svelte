<script lang="ts">
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import { tokenTypeToString } from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
    import { crcTypes, roundToDecimals, staticTypes } from '$lib/shared/utils/shared';
    import { formatCompactCurrency } from '$lib/shared/utils/money';
    import WrapTokens from '$lib/areas/wallet/ui/pages/WrapTokens.svelte';

    import UnwrapTokens from '$lib/areas/wallet/ui/pages/UnwrapTokens.svelte';
    import RedeemGroup from '$lib/areas/groups/ui/pages/RedeemGroup.svelte';
    import { openStep } from '$lib/shared/flow';
    import { openSendFlowPopup } from '$lib/areas/wallet/flows/send/openSendFlowPopup';
    import type { TokenBalance } from '@aboutcircles/sdk-types';
    import { circles } from '$lib/shared/state/circles';
    import { get } from 'svelte/store';
    import { formatEther } from 'ethers';
    import { openInfoPopup } from '$lib/shared/ui/shell/confirmDialogs';
    import { openTextPromptPopup } from '$lib/shared/ui/shell/promptDialogs';
    import { runTask } from '$lib/shared/utils/tasks';

    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

    interface Props { item: TokenBalance; }
    let { item }: Props = $props();

    type RowAction = {
        condition: (b: TokenBalance) => boolean;
        title: string;
        icon: string;
        component: any;
    };

    const actions: RowAction[] = [
        {
            condition: () => true,
            title: 'Send', icon: '/send.svg', component: null
        },
        {
            condition: (b) => ['CrcV2_RegisterHuman', 'CrcV2_RegisterGroup'].includes(b.tokenType ?? ''),
            title: 'Wrap', icon: '/banknotes.svg', component: WrapTokens
        },
        {
            condition: (b) => (b.tokenType ?? '') === 'CrcV2_RegisterGroup',
            title: 'Redeem', icon: '/redeem.svg', component: RedeemGroup
        },

        {
            condition: (b) => (b.tokenType ?? '') === 'CrcV2_ERC20WrapperDeployed_Demurraged',
            title: 'Unwrap', icon: '/banknotes.svg', component: UnwrapTokens
        },
        {
            condition: (b) => (b.tokenType ?? '') === 'CrcV2_ERC20WrapperDeployed_Inflationary',
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
        navigator.clipboard.writeText(item.isWrapped ? item.tokenAddress : String(item.tokenId ?? ''));
        copyIcon = '/check.svg';
        setTimeout(() => { copyIcon = '/copy.svg'; }, 1000);
    }

    async function handleReadHubBalance(): Promise<void> {
        const sdk = get(circles);
        const connectedAvatar = avatarState.avatar?.address;

        if (!sdk?.core?.hubV2) {
            await openInfoPopup({ title: 'Hub unavailable', message: 'Circles V2 hub contract is not available.', tone: 'warning' });
            return;
        }
        if (!connectedAvatar) {
            await openInfoPopup({ title: 'No avatar connected', message: 'No connected avatar found.', tone: 'warning' });
            return;
        }
        if (!item.tokenId) {
            await openInfoPopup({ title: 'Missing token id', message: 'No tokenId found for this balance row.', tone: 'warning' });
            return;
        }

        try {
            const tokenId = BigInt(item.tokenId);
            const balance = await sdk?.core?.hubV2.balanceOf(connectedAvatar, tokenId);
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
            await openInfoPopup({ title: 'Burn unavailable', message: 'Burn is only supported for ERC1155 balances.', tone: 'warning' });
            return;
        }
        if (!sdk?.core?.hubV2) {
            await openInfoPopup({ title: 'Hub unavailable', message: 'Circles V2 hub contract is not available.', tone: 'warning' });
            return;
        }
        if (!connectedAvatar) {
            await openInfoPopup({ title: 'No avatar connected', message: 'No connected avatar found.', tone: 'warning' });
            return;
        }
        if (!item.tokenId) {
            await openInfoPopup({ title: 'Missing token id', message: 'No tokenId found for this balance row.', tone: 'warning' });
            return;
        }

        const burnAmount = BigInt(item.attoCircles ?? '0');
        if (burnAmount <= 0n) {
            await openInfoPopup({ title: 'Nothing to burn', message: 'This balance has no burnable amount.', tone: 'warning' });
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
            promise: sdk.core.hubV2.safeTransferFrom(
                connectedAvatar,
                ZERO_ADDRESS,
                tokenId,
                burnAmount,
                '0x'
            ),
        });
    }
</script>

<!-- Token header -->
<div class="flex items-center gap-3 mb-4 p-3 rounded-xl bg-base-200/50">
    <div class="min-w-0 flex-1">
        <Avatar
            address={item.tokenOwner}
            view="horizontal"
            clickable={true}
            bottomInfo={tokenTypeToString(item.tokenType ?? '')}
        />
    </div>
    <div class="text-right tabular-nums shrink-0">
        <div class="font-bold">{formatCompactCurrency(item.circles ?? 0, 'CRC')}</div>
        <p class="text-xs text-base-content/70">
            {#if staticTypes.has(item.tokenType ?? '')}
                {roundToDecimals(item.staticCircles ?? 0)} Static Circles
            {/if}
            {#if crcTypes.has(item.tokenType ?? '')}
                {roundToDecimals(item.circles ?? 0)} CRC
            {/if}
        </p>
    </div>
</div>

<!-- Action list -->
<div class="space-y-1">
    {#each actions as action (action.title)}
        {#if action.condition(item)}
            <button
                type="button"
                class="btn btn-ghost justify-start w-full gap-3"
                onclick={() => executeAction(action)}
            >
                <img src={action.icon} alt="" class="w-5 h-5" aria-hidden="true" />
                {action.title}
            </button>
        {/if}
    {/each}
    <button
        type="button"
        class="btn btn-ghost justify-start w-full gap-3"
        onclick={handleCopy}
    >
        <img src={copyIcon} alt="" class="w-5 h-5" aria-hidden="true" />
        Copy token ID
    </button>
    <button
        type="button"
        class="btn btn-ghost justify-start w-full gap-3"
        onclick={() => void handleReadHubBalance()}
    >
        <img src="/banknotes.svg" alt="" class="w-5 h-5" aria-hidden="true" />
        Check hub balance
    </button>
    {#if item.isErc1155}
        <button
            type="button"
            class="btn btn-ghost justify-start w-full gap-3 text-error"
            onclick={() => void handleBurnFullBalance()}
        >
            <img src="/fire.svg" alt="" class="w-5 h-5" aria-hidden="true" />
            Burn
        </button>
    {/if}
</div>
