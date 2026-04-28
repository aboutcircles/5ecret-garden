<script lang="ts">
    import SearchablePaginatedList from '$lib/shared/ui/lists/SearchablePaginatedList.svelte';
    import HoldersRow from '$lib/shared/ui/profile/components/HoldersRow.svelte';
    import AvatarRowPlaceholder from '$lib/shared/ui/lists/placeholders/AvatarRowPlaceholder.svelte';
    import type { Address } from '@aboutcircles/sdk-types';
    import type { TrustRelationKind } from '$lib/shared/types/sdk-augment';
    import { writable } from 'svelte/store';
    import { createListInputArrowDownHandler } from '$lib/shared/ui/lists/utils/listInputArrowDown';
    import { usePopupListFocusRestore } from '$lib/shared/ui/profile/utils/popupListFocusRestore';

    interface HolderRow {
        avatar: Address;
        amount: bigint;
        amountToRedeem: bigint;
        amountToRedeemInCircles: number;
        trustRelation?: TrustRelationKind;
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
    usePopupListFocusRestore({
        getScope: () => listScopeEl,
        rowSelector: '[data-holder-row]',
        rowAddressAttribute: 'data-row-address',
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