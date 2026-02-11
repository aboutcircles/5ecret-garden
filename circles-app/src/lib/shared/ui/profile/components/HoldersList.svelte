<script lang="ts">
    import SearchablePaginatedList from '$lib/shared/ui/lists/SearchablePaginatedList.svelte';
    import HoldersRow from '$lib/shared/ui/profile/components/HoldersRow.svelte';
    import type { Address } from '@circles-sdk/utils';
    import type { TrustRelation } from '@circles-sdk/data';
    import { writable } from 'svelte/store';
    import { createListInputArrowDownHandler } from '$lib/shared/ui/lists/utils/listInputArrowDown';

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
        {searchPlaceholder}
        {emptyLabel}
        {noMatchesLabel}
    />
</div>