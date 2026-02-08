<script lang="ts">
    import GenericList from '$lib/components/GenericList.svelte';
    import TrustRelationRow from '$lib/components/TrustRelationRow.svelte';
    import { createPaginatedList } from '$lib/shared/state/paginatedList';
    import { createFilteredAddresses, createProfileNameStore } from '$lib/utils/searchableProfiles';
    import type { Address } from '@circles-sdk/utils';
    import type { Readable } from 'svelte/store';
    import { writable } from 'svelte/store';

    interface Props {
        addresses: Readable<Address[]>;
        emptyLabel?: string;
        noMatchesLabel?: string;
        rowHeight?: number;
        pageSize?: number;
    }

    let {
        addresses,
        emptyLabel = 'No connections',
        noMatchesLabel = 'No matches',
        rowHeight = 64,
        pageSize = 25,
    }: Props = $props();

    const searchQuery = writable('');
    const profileNames = createProfileNameStore(addresses);
    const filteredRows = createFilteredAddresses(addresses, searchQuery, profileNames);
    const paginatedRows = createPaginatedList(filteredRows, { pageSize });
</script>

<div class="mb-3">
    <input
        type="text"
        class="input input-bordered w-full"
        placeholder="Search by address or name"
        bind:value={$searchQuery}
    />
</div>

{#if ($addresses ?? []).length === 0}
    <div class="w-full py-6 text-center text-base-content/60">{emptyLabel}</div>
{:else if ($filteredRows ?? []).length === 0}
    <div class="w-full py-6 text-center text-base-content/60">{noMatchesLabel}</div>
{:else}
    <GenericList
        store={paginatedRows}
        row={TrustRelationRow}
        getKey={(addr) => String(addr)}
        rowHeight={rowHeight}
        maxPlaceholderPages={2}
        expectedPageSize={pageSize}
    />
{/if}