<script lang="ts">
    import CollateralTable from '$lib/components/CollateralTable.svelte';
    import { getProfile } from '$lib/utils/profile';
    import type { Address } from '@circles-sdk/utils';
    import type { TrustRelation } from '@circles-sdk/data';

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

    let searchQuery = $state('');
    let profileNames = $state<Record<string, string>>({});

    const filteredRows = $derived.by(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return holders;
        return holders.filter((row) => {
            const key = row.avatar.toLowerCase();
            const name = (profileNames[key] ?? '').toLowerCase();
            return key.includes(q) || name.includes(q);
        });
    });

    $effect(() => {
        holders.forEach((row) => {
            const key = row.avatar.toLowerCase();
            if (profileNames[key] !== undefined) return;
            getProfile(row.avatar)
                .then((profile) => {
                    profileNames = { ...profileNames, [key]: profile?.name ?? '' };
                })
                .catch(() => {
                    profileNames = { ...profileNames, [key]: '' };
                });
        });
    });
</script>

<div class="mb-3">
    <input
        type="text"
        class="input input-bordered w-full"
        placeholder="Search by address or name"
        bind:value={searchQuery}
    />
</div>

<CollateralTable collateralInTreasury={filteredRows} />