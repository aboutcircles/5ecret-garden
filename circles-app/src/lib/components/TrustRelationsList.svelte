<script lang="ts">
    import GenericList from '$lib/components/GenericList.svelte';
    import TrustRelationRow from '$lib/components/TrustRelationRow.svelte';
    import { createPaginatedList } from '$lib/stores/paginatedList';
    import { circles } from '$lib/stores/circles';
    import { get, writable } from 'svelte/store';
    import { getProfile } from '$lib/utils/profile';
    import type { Address } from '@circles-sdk/utils';

    type RelationFilter = 'trusts' | 'trustedBy';

    interface Props {
        avatarAddress?: Address;
        relation: RelationFilter;
        count?: number;
    }

    let { avatarAddress, relation, count = $bindable(0) }: Props = $props();

    let loading = $state(true);
    let error: string | null = $state(null);
    let rows: Address[] = $state([]);
    let searchQuery = $state('');
    let profileNames = $state<Record<string, string>>({});

    async function loadRelations(): Promise<void> {
        loading = true;
        error = null;
        rows = [];
        try {
            const sdk = get(circles);
            if (!sdk || !avatarAddress) {
                loading = false;
                count = 0;
                return;
            }

            const list: Address[] = [];

            const relations = await sdk.data.getAggregatedTrustRelations(avatarAddress);
            if (relation === 'trusts') {
                list.push(
                    ...relations
                        .filter((row) => row.relation === 'trusts' || row.relation === 'mutuallyTrusts')
                        .map((row) => row.objectAvatar as Address)
                );
            } else {
                list.push(
                    ...relations
                        .filter((row) => row.relation === 'trustedBy' || row.relation === 'mutuallyTrusts')
                        .map((row) => row.objectAvatar as Address)
                );
            }

            const unique = Array.from(new Set(list))
                .filter((addr) => addr !== avatarAddress)
                .sort((a, b) => a.localeCompare(b));

            rows = unique;
            count = rows.length;
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to load trust relations';
            rows = [];
            count = 0;
        } finally {
            loading = false;
        }
    }

    const filteredRows = $derived.by(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((addr) => {
            const key = addr.toLowerCase();
            const name = (profileNames[key] ?? '').toLowerCase();
            return key.includes(q) || name.includes(q);
        });
    });

    const filteredRowsStore = writable<Address[]>([]);

    $effect(() => {
        rows.forEach((addr) => {
            const key = addr.toLowerCase();
            if (profileNames[key] !== undefined) return;
            getProfile(addr)
                .then((profile) => {
                    profileNames = { ...profileNames, [key]: profile?.name ?? '' };
                })
                .catch(() => {
                    profileNames = { ...profileNames, [key]: '' };
                });
        });
    });

    $effect(() => {
        filteredRowsStore.set(filteredRows);
    });

    $effect(() => {
        void loadRelations();
    });

    const paginatedRows = createPaginatedList(filteredRowsStore, { pageSize: 25 });
</script>

<div class="mb-3">
    <input
        type="text"
        class="input input-bordered w-full"
        placeholder="Search by address or name"
        bind:value={searchQuery}
    />
</div>

{#if loading}
    <div class="w-full py-6 text-center text-base-content/60">Loading…</div>
{:else if error}
    <div class="w-full py-6 text-center text-error">{error}</div>
{:else if rows.length === 0}
    <div class="w-full py-6 text-center text-base-content/60">No connections</div>
{:else if filteredRows.length === 0}
    <div class="w-full py-6 text-center text-base-content/60">No matches</div>
{:else}
    <GenericList
        store={paginatedRows}
        row={TrustRelationRow}
        getKey={(addr) => String(addr)}
        rowHeight={64}
        maxPlaceholderPages={2}
        expectedPageSize={25}
    />
{/if}