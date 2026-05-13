<script lang="ts">
    import { getContext } from 'svelte';
    import { getTimeAgo } from '$lib/shared/utils/shared';
    import type { TransactionHistoryRow } from '@circles-sdk/data';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import { popupControls, type PopupContentDefinition } from '$lib/shared/state/popup';
    import { T } from '$lib/design-system/tokens.js';
    import TransactionDetailsPopup from './TransactionDetailsPopup.svelte';
    import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';
    import {
        VIRTUAL_LIST_CONTEXT_KEY,
        type VirtualListController,
    } from '$lib/shared/ui/lists/utils/virtualListContext';

    interface Props { item: TransactionHistoryRow; }
    let { item }: Props = $props();

    const virtualList = getContext<VirtualListController | undefined>(VIRTUAL_LIST_CONTEXT_KEY);

    const avatarAddress = $derived(avatarState.avatar?.address ?? null);

    const counterpartyAddress = $derived.by(() => {
        if (!avatarAddress) return null;
        return getCounterpartyAddress(avatarAddress);
    });

    const topInfoText = $derived.by(() => getTopInfo());

    const badgeUrl = $derived.by(() => {
        if (!avatarAddress) return null;
        return getBadge(avatarAddress);
    });

    const sent = $derived.by(() => {
        if (!avatarAddress) return false;
        return item.from.toLowerCase() === avatarAddress.toLowerCase();
    });

    const displayAmount = $derived.by(() => {
        if (!avatarAddress) return '';
        const prefix = sent ? '-' : '+';
        return `${prefix}${formatNetCircles(item.circles)}`;
    });

    function getCounterpartyAddress(avatarAddress: string) {
        const zero = '0x0000000000000000000000000000000000000000';
        const lowerFrom = item.from.toLowerCase();
        const lowerTo = item.to.toLowerCase();
        const lowerAvatar = avatarAddress.toLowerCase();
        if (item.from === zero) return lowerTo;     // mint
        if (item.to === zero) return lowerAvatar;   // burn
        return lowerFrom === lowerAvatar ? lowerTo : lowerFrom;
    }

    function getTopInfo(): string {
        const zero = '0x0000000000000000000000000000000000000000';
        return item.from === zero ? 'Collected CRC' : '';
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
        const current = event.currentTarget as HTMLElement | null;
        if (!current) {
            listNavigator.onRowKeydown(event);
            return;
        }

        const virtualIndexAttr = current?.closest<HTMLElement>('[data-virtual-index]')?.dataset.virtualIndex;
        const virtualIndex = Number(virtualIndexAttr ?? '-1');
        const hasVirtualIndex = Number.isFinite(virtualIndex) && virtualIndex >= 0;

        if (virtualList && hasVirtualIndex) {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                const next = Math.min(virtualList.rowCount() - 1, virtualIndex + 1);
                if (next !== virtualIndex) {
                    virtualList.focusIndex(next);
                }
                return;
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                if (virtualIndex === 0) {
                    focusTransactionSearchInput(current);
                    return;
                }

                if (virtualIndex > 0) {
                    virtualList.focusIndex(virtualIndex - 1);
                }
                return;
            }
        }

        listNavigator.onRowKeydown(event);
    }

    function onRowClick(event: MouseEvent): void {
        listNavigator.onRowClick(event);
        openDetails();
    }
</script>

<div
    data-transaction-row
    data-list-row-focusable
    tabindex={0}
    role="button"
    aria-label={`Open transaction details for ${counterpartyAddress}`}
    class="tr-row focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    style="
        display:flex;align-items:center;gap:12px;padding:12px 20px;
        min-height:var(--transaction-row-height,84px);cursor:pointer;
        border-bottom:1px solid {T.hairlineSoft};box-sizing:border-box;
        transition:background .12s;
    "
    onkeydown={onRowKeydown}
    onclick={onRowClick}
>
    <div style="flex:1;min-width:0;">
        <Avatar
            address={counterpartyAddress}
            view="horizontal"
            clickable={false}
            pictureOverlayUrl={badgeUrl ?? undefined}
            topInfo={topInfoText}
            bottomInfo={getTimeAgo(item.timestamp)}
        />
    </div>
    <div style="text-align:right;flex-shrink:0;">
        <div style="font-family:{T.fontMono};font-size:14px;font-weight:600;color:{sent ? T.negative : T.positive};font-variant-numeric:tabular-nums;">
            {displayAmount}
        </div>
        <div style="font-size:11px;color:{T.inkMuted};font-weight:500;margin-top:1px;">CRC</div>
    </div>
</div>

<style>
  .tr-row { transition: background 180ms ease-out; }
  .tr-row:hover { background: #F6F5F2; }
  .tr-row:focus-visible { background: #F6F5F2; }
</style>
