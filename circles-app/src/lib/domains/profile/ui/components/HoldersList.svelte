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

    const holdersStore = writable<HolderRow[]>([]);

    $effect(() => {
        holdersStore.set(holders);
    });
</script>

<SearchablePaginatedList
    items={holdersStore}
    row={HoldersRow}
    getKey={(item) => String(item.avatar)}
    addressOf={(row) => String(row.avatar)}
    emptyLabel="No holders"
    noMatchesLabel="No matches"
    rowHeight={64}
    pageSize={25}
    searchPlaceholder="Search by address or name"
/>