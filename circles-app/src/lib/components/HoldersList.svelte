<script lang="ts">
    import CollateralTable from '$lib/components/CollateralTable.svelte';
    import { createFilteredAddresses, createProfileNameStore } from '$lib/utils/searchableProfiles';
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

<CollateralTable collateralInTreasury={$filteredRows} />