<script lang="ts">
    import { getTimeAgo } from '$lib/shared/utils/shared';
    import type { TransactionHistoryRow } from '@circles-sdk/data';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
    import { popupControls, type PopupContentDefinition } from '$lib/shared/state/popup';
    import TransactionDetailsPopup from './TransactionDetailsPopup.svelte';
    import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';

    interface Props { item: TransactionHistoryRow; }
    let { item }: Props = $props();

    let counterpartyAddress = $state<string | null>(null);
    let badgeUrl: string | null = $state(null);
    let displayAmount = $state('');
    let sent = $state(false);
    let topInfoText = $state('');

    function getCounterpartyAddress(avatarAddress: string) {
        const zero = '0x0000000000000000000000000000000000000000';
        const lowerFrom = item.from.toLowerCase();
        const lowerTo = item.to.toLowerCase();
        const lowerAvatar = avatarAddress.toLowerCase();
        if (item.from === zero) return lowerTo;     // mint
        if (item.to === zero) return lowerAvatar;   // burn
        return lowerFrom === lowerAvatar ? lowerTo : lowerFrom;
    }

    function getTopInfo(avatarAddress: string): string {
        const zero = '0x0000000000000000000000000000000000000000';
        if (item.from === zero && item.to.toLowerCase() === avatarAddress.toLowerCase()) {
            return 'Collected CRC';
        }
        return '';
    }

    function getBadge(avatarAddress: string) {
        const zero = '0x0000000000000000000000000000000000000000';
        const lowerFrom = item.from.toLowerCase();
        const lowerTo = item.to.toLowerCase();
        const lowerAvatar = avatarAddress.toLowerCase();
        if (item.from === zero) return '/badge-mint.svg';
        if (item.to === zero) return '/badge-burn.svg';
        if (lowerFrom === lowerAvatar) return '/badge-sent.svg';
        if (lowerTo === lowerAvatar) return '/badge-received.svg';
        return null;
    }

    function formatNetCircles(amount: number): string {
        const abs = Math.abs(amount);
        return abs < 0.01 ? '< 0.01' : abs.toFixed(2);
    }

    function openDetails() {
        const def: PopupContentDefinition = {
            title: 'Transaction details',
            component: TransactionDetailsPopup,
            props: { item }
        };
        popupControls.open(def);
    }

    function focusTransactionSearchInput(anchor?: HTMLElement | null): void {
        const scope = anchor?.closest<HTMLElement>('[data-transactions-list-scope]')
            ?? document.querySelector<HTMLElement>('[data-transactions-list-scope]');
        const input = scope?.querySelector<HTMLInputElement>('[data-transactions-search-input]')
            ?? document.querySelector<HTMLInputElement>('[data-transactions-search-input]');
        input?.focus();
    }

    const listNavigator = createKeyboardListNavigator({
        getRows: (anchor) => {
            const scope = anchor?.closest<HTMLElement>('[data-transactions-list-scope]')
                ?? document.querySelector<HTMLElement>('[data-transactions-list-scope]');
            return Array.from((scope ?? document).querySelectorAll<HTMLElement>('[data-transaction-row]'));
        },
        focusInput: focusTransactionSearchInput,
        onActivateRow: openDetails,
    });

    function onRowKeydown(event: KeyboardEvent): void {
        listNavigator.onRowKeydown(event);
    }

    function onRowClick(event: MouseEvent): void {
        listNavigator.onRowClick(event);
        openDetails();
    }

    $effect(() => {
        if (!avatarState.avatar) {
            counterpartyAddress = null;
            return;
        }
        counterpartyAddress = getCounterpartyAddress(avatarState.avatar.address);
        topInfoText = getTopInfo(avatarState.avatar.address);
        badgeUrl = getBadge(avatarState.avatar.address);
        sent = item.from.toLowerCase() === avatarState.avatar.address.toLowerCase();
        const prefix = sent ? '-' : '+';
        displayAmount = `${prefix}${formatNetCircles(item.circles)}`;
    });
</script>

<!-- One cohesive horizontal block inside content; collapse RowFrame leading -->
<div
    data-transaction-row
    tabindex={0}
    role="button"
    aria-label={`Open transaction details for ${counterpartyAddress}`}
    class="rounded-[var(--row-radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    onkeydown={onRowKeydown}
    onclick={onRowClick}
>
    <RowFrame clickable={true} dense={true} noLeading={true}>
        <div class="w-full flex items-center justify-between cursor-pointer">
            <div class="min-w-0">
                <Avatar
                        address={counterpartyAddress}
                        view="horizontal"
                        clickable={true}
                        pictureOverlayUrl={badgeUrl ?? undefined}
                        topInfo={topInfoText}
                        bottomInfo={getTimeAgo(item.timestamp)}
                />
            </div>

            <div class="text-right shrink-0">
                {#if sent}
                    <span class="text-error font-bold">{displayAmount}</span>
                {:else}
                    <span class="text-success font-bold">{displayAmount}</span>
                {/if}
                <span> CRC</span>
            </div>
        </div>
    </RowFrame>
</div>
