<script lang="ts">
    import SearchablePaginatedAddressList from '$lib/components/SearchablePaginatedAddressList.svelte';
    import { circles } from '$lib/stores/circles';
    import { get, writable } from 'svelte/store';
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
    const rowsStore = writable<Address[]>([]);

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
            rowsStore.set(rows);
            count = rows.length;
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to load trust relations';
            rows = [];
            rowsStore.set([]);
            count = 0;
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        void loadRelations();
    });

</script>

{#if loading}
    <div class="w-full py-6 text-center text-base-content/60">Loading…</div>
{:else if error}
    <div class="w-full py-6 text-center text-error">{error}</div>
{:else}
    <SearchablePaginatedAddressList
        addresses={rowsStore}
        emptyLabel="No connections"
        noMatchesLabel="No matches"
    />
{/if}