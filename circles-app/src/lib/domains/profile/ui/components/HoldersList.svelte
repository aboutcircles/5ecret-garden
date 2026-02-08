<script lang="ts">
    import GenericList from '$lib/shared/ui/common/GenericList.svelte';
    import HoldersRow from '$lib/domains/profile/ui/components/HoldersRow.svelte';
    import { createPaginatedList } from '$lib/shared/state/paginatedList';
    import { createFilteredAddresses, createProfileNameStore } from '$lib/shared/utils/searchableProfiles';
    import type { Address } from '@circles-sdk/utils';
    import type { TrustRelation } from '@circles-sdk/data';
    import { derived, writable } from 'svelte/store';

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

    const searchQuery = writable('');
    const holdersStore = writable<HolderRow[]>([]);
    const holderAddresses = derived(holdersStore, ($holders) => $holders.map((row) => row.avatar));
    const profileNames = createProfileNameStore(holderAddresses);
    const filteredAddresses = createFilteredAddresses(holderAddresses, searchQuery, profileNames);
    const filteredRows = derived([holdersStore, filteredAddresses], ([$holders, $filtered]) =>
        $holders.filter((row) => $filtered.includes(row.avatar))
    );

    const paginatedRows = createPaginatedList(filteredRows, { pageSize: 25 });

    $effect(() => {
        holdersStore.set(holders);
    });
</script>

<div class="mb-3">
    <input
        type="text"
        class="input input-bordered w-full"
        placeholder="Search by address or name"
        bind:value={$searchQuery}
    />
</div>

{#if holders.length === 0}
    <div class="w-full py-6 text-center text-base-content/60">No holders</div>
{:else if ($filteredRows ?? []).length === 0}
    <div class="w-full py-6 text-center text-base-content/60">No matches</div>
{:else}
    <GenericList
        store={paginatedRows}
        row={HoldersRow}
        getKey={(item) => String(item.avatar)}
        rowHeight={64}
        maxPlaceholderPages={2}
        expectedPageSize={25}
    />
{/if}