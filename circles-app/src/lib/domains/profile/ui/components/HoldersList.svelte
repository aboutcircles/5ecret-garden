<script lang="ts">
    import GenericList from '$lib/shared/ui/common/GenericList.svelte';
    import ListStates from '$lib/shared/ui/common/ListStates.svelte';
    import ListToolbar from '$lib/shared/ui/common/ListToolbar.svelte';
    import HoldersRow from '$lib/domains/profile/ui/components/HoldersRow.svelte';
    import type { Address } from '@circles-sdk/utils';
    import type { TrustRelation } from '@circles-sdk/data';
    import { writable } from 'svelte/store';
    import { createSearchablePaginatedList } from '$lib/shared/state/searchablePaginatedList';

    interface HolderRow {
        avatar: Address;
        amount: bigint;
        amountToRedeem: bigint;
        amountToRedeemInCircles: number;
        trustRelation?: TrustRelation;
    }

    interface Props {
        holders: HolderRow[];
    }

    let { holders }: Props = $props();

    const holdersStore = writable<HolderRow[]>([]);

    const { searchQuery, filteredItems, paginatedItems } = createSearchablePaginatedList(holdersStore, {
        pageSize: 25,
        addressOf: (row) => row.avatar
    });

    $effect(() => {
        holdersStore.set(holders);
    });
</script>

<ListToolbar query={searchQuery} placeholder="Search by address or name" />

<ListStates
    isEmpty={holders.length === 0}
    emptyLabel="No holders"
    isNoMatches={holders.length > 0 && ($filteredItems ?? []).length === 0}
    noMatchesLabel="No matches"
>
    <GenericList
        store={paginatedItems}
        row={HoldersRow}
        getKey={(item) => String(item.avatar)}
        rowHeight={64}
        maxPlaceholderPages={2}
        expectedPageSize={25}
    />
</ListStates>