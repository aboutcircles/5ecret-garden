<script lang="ts">
    import { onDestroy } from 'svelte';
    import type { Component } from 'svelte';
    import SearchablePaginatedList from '$lib/shared/ui/lists/SearchablePaginatedList.svelte';
    import AvatarRowPlaceholder from '$lib/shared/ui/lists/placeholders/AvatarRowPlaceholder.svelte';
    import TrustRelationRow from '$lib/shared/ui/profile/components/TrustRelationRow.svelte';
    import type { Address } from '@circles-sdk/utils';
    import type { Readable } from 'svelte/store';
    import { createListInputArrowDownHandler } from '$lib/shared/ui/lists/utils/listInputArrowDown';
    import { popupState } from '$lib/shared/state/popup';

    interface Props {
        addresses: Readable<Address[]>;
        row?: Component<{ item: Address }>;
        getKey?: (addr: Address) => string;
        emptyLabel?: string;
        noMatchesLabel?: string;
        loading?: boolean;
        error?: string | null;
        rowHeight?: number;
        pageSize?: number;
        searchPlaceholder?: string;
    }

    let {
        addresses,
        row = TrustRelationRow,
        getKey = (addr) => String(addr),
        emptyLabel = 'No connections',
        noMatchesLabel = 'No matches',
        loading = false,
        error = null,
        rowHeight = 64,
        pageSize = 25,
        searchPlaceholder = 'Search by address or name'
    }: Props = $props();

    let listScopeEl: HTMLDivElement | null = $state(null);

    const onInputArrowDown = createListInputArrowDownHandler({
        getScope: () => listScopeEl,
        rowSelector: '[data-trust-relation-row]'
    });

    let lastFocusedAddress = $state<string | null>(null);

    function captureFocusedRowAddress(): void {
        if (!listScopeEl || typeof document === 'undefined') return;
        const active = document.activeElement as HTMLElement | null;
        const row = active?.closest<HTMLElement>('[data-trust-relation-row][data-row-address]');
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
                const row = listScopeEl.querySelector<HTMLElement>(`[data-trust-relation-row][data-row-address="${lastFocusedAddress}"]`);
                row?.focus({ preventScroll: true });
            });
        }

        previousPopupDepth = depth;
    });

    onDestroy(() => {
        unsubscribePopup();
    });
</script>

<div data-profile-relations-list-scope bind:this={listScopeEl}>
        <SearchablePaginatedList
        items={addresses}
        {row}
        getKey={getKey}
        addressOf={(addr) => String(addr)}
        onInputKeydown={onInputArrowDown}
        inputDataAttribute="data-profile-relations-search-input"
        {loading}
        {error}
        emptyLabel={emptyLabel}
        noMatchesLabel={noMatchesLabel}
        rowHeight={rowHeight}
        pageSize={pageSize}
        searchPlaceholder={searchPlaceholder}
        placeholderRow={AvatarRowPlaceholder}
    />
</div>