<script lang="ts">
    import SearchablePaginatedList from '$lib/shared/ui/common/SearchablePaginatedList.svelte';
    import HoldersRow from '$lib/domains/profile/ui/components/HoldersRow.svelte';
    import type { Address } from '@circles-sdk/utils';
    import type { TrustRelation } from '@circles-sdk/data';
    import { writable } from 'svelte/store';

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
    let listScopeEl: HTMLDivElement | null = $state(null);

    const holdersStore = writable<HolderRow[]>([]);

    $effect(() => {
        holdersStore.set(holders);
    });

    function onInputArrowDown(event: KeyboardEvent): void {
        if (event.key !== 'ArrowDown') return;
        const firstRow = listScopeEl?.querySelector<HTMLElement>('[data-holder-row]');
        if (!firstRow) return;
        event.preventDefault();
        firstRow.focus();
    }
</script>

<div data-profile-holders-list-scope bind:this={listScopeEl}>
    <SearchablePaginatedList
        items={holdersStore}
        row={HoldersRow}
        getKey={(item) => String(item.avatar)}
        addressOf={(row) => String(row.avatar)}
        onInputKeydown={onInputArrowDown}
        inputDataAttribute="data-holders-search-input"
        emptyLabel="No holders"
        noMatchesLabel="No matches"
        rowHeight={64}
        pageSize={25}
        searchPlaceholder="Search by address or name"
    />
</div>