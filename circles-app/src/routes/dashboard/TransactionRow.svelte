<script lang="ts">
    import { getContext } from 'svelte';
    import { getTimeAgo } from '$lib/shared/utils/shared';
    import type { GroupedTransaction } from '$lib/shared/state/transactionHistory';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import { popupControls, type PopupContentDefinition } from '$lib/shared/state/popup';
    import { T } from '$lib/design-system/tokens.js';
    import TransactionDetailsPopup from './TransactionDetailsPopup.svelte';
    import { ZERO_ADDRESS } from '$lib/shared/utils/tx';
    import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';
    import {
        VIRTUAL_LIST_CONTEXT_KEY,
        type VirtualListController,
    } from '$lib/shared/ui/lists/utils/virtualListContext';

    interface Props { item: GroupedTransaction; }
    let { item }: Props = $props();

    const virtualList = getContext<VirtualListController | undefined>(VIRTUAL_LIST_CONTEXT_KEY);

    const counterpartyAddress = $derived(item.counterparty?.toLowerCase() ?? null);

    const topInfoText = $derived(item.hasMint ? 'Collected CRC' : '');

    const badgeUrl = $derived.by(() => {
        if (item.hasMint) return '/badge-mint.svg';
        if (item.hasBurn) return '/badge-burn.svg';
        if (item.type === 'send') return '/badge-sent.svg';
        if (item.type === 'receive') return '/badge-received.svg';
        return null;
    });

    const sent = $derived(item.netCircles < 0);

    const displayAmount = $derived.by(() => {
        const prefix = sent ? '-' : '+';
        return `${prefix}${formatNetCircles(Math.abs(item.netCircles))}`;
    });

    function formatNetCircles(amount: number): string {
        const abs = Math.abs(amount);
        return abs < 0.01 ? '< 0.01' : abs.toFixed(2);
    }

    function openDetails() {
        // Popup expects a TransactionHistoryRow-shaped object. The first raw event is a
        // poor representative for grouped transactions (it could be a small Burn/demurrage
        // entry, which would mis-render the headline & direction). Synthesize a row from
        // the GROUP's aggregate so the popup header shows the correct net amount,
        // counterparty, and direction. The full events array drives the breakdowns.
        const representative = item.events[0];
        const userAddr = (avatarState.avatar?.address ?? '').toLowerCase();
        const counterparty = item.counterparty ?? null;
        const userIsSender = item.netCircles < 0;
        const synthFrom = userIsSender
            ? (userAddr || representative?.from || ZERO_ADDRESS)
            : (counterparty ?? representative?.from ?? ZERO_ADDRESS);
        const synthTo = userIsSender
            ? (counterparty ?? representative?.to ?? ZERO_ADDRESS)
            : (userAddr || representative?.to || ZERO_ADDRESS);
        const popupItem = {
            ...(representative ?? {}),
            from: synthFrom,
            to: synthTo,
            circles: Math.abs(item.netCircles),
            timestamp: item.timestamp,
            transactionHash: item.transactionHash,
            events: item.events,
        };
        const def: PopupContentDefinition = {
            title: 'Transaction details',
            component: TransactionDetailsPopup,
            props: { item: popupItem }
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
        transition:background .12s ease-out;
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
