<script lang="ts">
    import type { Component } from 'svelte';
    import SearchablePaginatedList from '$lib/shared/ui/common/SearchablePaginatedList.svelte';
    import TrustRelationRow from '$lib/domains/profile/ui/components/TrustRelationRow.svelte';
    import type { Address } from '@circles-sdk/utils';
    import type { Readable } from 'svelte/store';

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
</script>

<SearchablePaginatedList
    items={addresses}
    {row}
    getKey={getKey}
    addressOf={(addr) => String(addr)}
    {loading}
    {error}
    emptyLabel={emptyLabel}
    noMatchesLabel={noMatchesLabel}
    rowHeight={rowHeight}
    pageSize={pageSize}
    searchPlaceholder={searchPlaceholder}
/>