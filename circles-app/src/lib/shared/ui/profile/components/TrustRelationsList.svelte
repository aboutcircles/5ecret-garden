<script lang="ts">
    import SearchablePaginatedAddressList from '$lib/shared/ui/profile/components/SearchablePaginatedAddressList.svelte';
    import { circles } from '$lib/shared/state/circles';
    import { get, writable } from 'svelte/store';
    import type { Address } from '@aboutcircles/sdk-types';
    import { createTrustDataSource } from '$lib/shared/data/circles/trustDataSource';
    import { createGroupDataSource } from '$lib/shared/data/circles/groupDataSource';
    import { isGroupType } from '$lib/shared/utils/avatarHelpers';

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

            // For groups the "Trusts" tab is the member list, sourced from V_CrcV2.GroupMemberships.
            // The trust-relations view doesn't include the group→member edges under the new SDK.
            const avatarInfo = await sdk.data.getAvatar(avatarAddress).catch(() => null);
            const subjectIsGroup = isGroupType(avatarInfo?.type);

            if (relation === 'trusts' && subjectIsGroup) {
                const groupDataSource = createGroupDataSource(sdk);
                const members = await groupDataSource.getGroupMembers(avatarAddress);
                list.push(
                    ...members
                        .map((row) => row.member as Address)
                        .filter((addr) => addr !== avatarAddress)
                );
            } else {
                const trustDataSource = createTrustDataSource(sdk);
                const relations = await trustDataSource.getAggregatedTrustRelations(avatarAddress);
                if (relation === 'trusts') {
                    list.push(
                        ...relations
                            .filter((row) => row.relation === 'trusts' || row.relation === 'mutuallyTrusts')
                            .filter((row) => row.objectAvatar !== avatarAddress)
                            .map((row) => row.objectAvatar as Address)
                    );
                } else {
                    list.push(
                        ...relations
                            .filter((row) => row.relation === 'trustedBy' || row.relation === 'mutuallyTrusts')
                            .filter((row) => row.objectAvatar !== avatarAddress)
                            .map((row) => row.objectAvatar as Address)
                    );
                }
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

<SearchablePaginatedAddressList
    addresses={rowsStore}
    loading={loading}
    {error}
    emptyLabel="No connections"
    noMatchesLabel="No matches"
/>