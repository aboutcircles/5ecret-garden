<script lang="ts">
    import type { Component } from 'svelte';
    import GenericList from '$lib/shared/ui/common/GenericList.svelte';
    import ListStates from '$lib/shared/ui/common/ListStates.svelte';
    import ListToolbar from '$lib/shared/ui/common/ListToolbar.svelte';
    import TrustRelationRow from '$lib/domains/profile/ui/components/TrustRelationRow.svelte';
    import { createSearchablePaginatedList } from '$lib/shared/state/searchablePaginatedList';
    import { createPaginatedList } from '$lib/shared/state/paginatedList';
    import type { Address } from '@circles-sdk/utils';
    import { readable, writable, type Readable, type Writable } from 'svelte/store';

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

    // Keep the stores as top-level bindings so they can be used with `$store` auto-subscription.
    // Initialized with safe placeholders, then replaced in an effect to stay reactive and avoid
    // `state_referenced_locally` warnings.
    const emptyItems = readable<Address[]>([]);

    let searchQuery = $state<Writable<string>>(writable(''));
    let filteredItems = $state<Readable<Address[]>>(emptyItems);
    let paginatedItems = $state(createPaginatedList(emptyItems, { pageSize: 1 }));

    $effect(() => {
        const next = createSearchablePaginatedList(addresses, {
            pageSize,
            addressOf: (addr) => addr
        });

        searchQuery = next.searchQuery;
        filteredItems = next.filteredItems;
        paginatedItems = next.paginatedItems;
    });
</script>

<ListToolbar query={searchQuery} placeholder={searchPlaceholder} />

<ListStates
    loading={loading}
    {error}
    isEmpty={($addresses ?? []).length === 0}
    isNoMatches={($addresses ?? []).length > 0 && ($filteredItems ?? []).length === 0}
    {emptyLabel}
    noMatchesLabel={noMatchesLabel}
>
    <GenericList
        store={paginatedItems}
        {row}
        getKey={getKey}
        rowHeight={rowHeight}
        maxPlaceholderPages={2}
        expectedPageSize={pageSize}
    />
</ListStates>