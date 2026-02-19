<script lang="ts">
    import { onDestroy } from 'svelte';
    import SearchablePaginatedList from '$lib/shared/ui/lists/SearchablePaginatedList.svelte';
    import HoldersRow from '$lib/shared/ui/profile/components/HoldersRow.svelte';
    import AvatarRowPlaceholder from '$lib/shared/ui/lists/placeholders/AvatarRowPlaceholder.svelte';
    import type { Address } from '@circles-sdk/utils';
    import type { TrustRelation } from '@circles-sdk/data';
    import { writable } from 'svelte/store';
    import { createListInputArrowDownHandler } from '$lib/shared/ui/lists/utils/listInputArrowDown';
    import { popupState } from '$lib/shared/state/popup';

    interface HolderRow {
        avatar: Address;
        amount: bigint;
        amountToRedeem: bigint;
        amountToRedeemInCircles: number;
        trustRelation?: TrustRelation;
    }

    interface Props {
        holders: HolderRow[];
        emptyLabel?: string;
        noMatchesLabel?: string;
        searchPlaceholder?: string;
    }

    let {
        holders,
        emptyLabel = 'No holders',
        noMatchesLabel = 'No matches',
        searchPlaceholder = 'Search by address or name'
    }: Props = $props();
    let listScopeEl: HTMLDivElement | null = $state(null);

    const holdersStore = writable<HolderRow[]>([]);

    $effect(() => {
        holdersStore.set(holders);
    });

    const onInputArrowDown = createListInputArrowDownHandler({
        getScope: () => listScopeEl,
        rowSelector: '[data-holder-row]'
    });

    let lastFocusedAddress = $state<string | null>(null);

    function captureFocusedRowAddress(): void {
        if (!listScopeEl || typeof document === 'undefined') return;
        const active = document.activeElement as HTMLElement | null;
        const row = active?.closest<HTMLElement>('[data-holder-row][data-row-address]');
        const inScope = !!row && listScopeEl.contains(row);
        if (!inScope) return;
        const addr = row?.dataset.rowAddress;
        if (addr) lastFocusedAddress = addr;
    }

    let previousPopupDepth = $state(0);
    const unsubscribePopup = popupState.subscribe((state) => {
        const depth = state.content ? state.stack.length + 1 : 0;

        if (depth > previousPopupDepth) {
            captureFocusedRowAddress();
        }

        if (depth < previousPopupDepth && lastFocusedAddress && listScopeEl) {
            requestAnimationFrame(() => {
                if (!listScopeEl) return;
                const row = listScopeEl.querySelector<HTMLElement>(`[data-holder-row][data-row-address="${lastFocusedAddress}"]`);
                row?.focus({ preventScroll: true });
            });
        }

        previousPopupDepth = depth;
    });

    onDestroy(() => {
        unsubscribePopup();
    });
</script>

<div data-profile-holders-list-scope bind:this={listScopeEl}>
    <SearchablePaginatedList
        items={holdersStore}
        row={HoldersRow}
        getKey={(item) => String(item.avatar)}
        addressOf={(row) => String(row.avatar)}
        onInputKeydown={onInputArrowDown}
        inputDataAttribute="data-holders-search-input"
        rowHeight={64}
        pageSize={25}
        placeholderRow={AvatarRowPlaceholder}
        {searchPlaceholder}
        {emptyLabel}
        {noMatchesLabel}
    />
</div>