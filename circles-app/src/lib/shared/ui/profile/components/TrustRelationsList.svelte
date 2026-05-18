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

    // Match the transaction-history page size so the Trusts tab renders
    // its first batch of members quickly; remaining pages stream in.
    const GROUP_MEMBERS_PAGE_SIZE = 25;

    let loading = $state(true);
    let error: string | null = $state(null);
    const rowsStore = writable<Address[]>([]);
    let loadGeneration = 0;

    async function loadRelations(): Promise<void> {
        const generation = ++loadGeneration;
        loading = true;
        error = null;
        rowsStore.set([]);
        count = 0;

        try {
            const sdk = get(circles);
            if (!sdk || !avatarAddress) {
                loading = false;
                return;
            }

            // For groups the "Trusts" tab is the member list, sourced from V_CrcV2.GroupMemberships.
            // The trust-relations view doesn't include the group→member edges under the new SDK.
            const avatarInfo = await sdk.data.getAvatar(avatarAddress).catch((e) => {
                console.warn('[TrustRelationsList] getAvatar failed; defaulting to trust path', e);
                return null;
            });
            if (generation !== loadGeneration) return;
            const subjectIsGroup = isGroupType(avatarInfo?.type);

            if (relation === 'trusts' && subjectIsGroup) {
                const groupDataSource = createGroupDataSource(sdk);
                const seen = new Set<string>();
                let cursor: string | null = null;
                let first = true;

                do {
                    const page = await groupDataSource.getGroupMembersPage(
                        avatarAddress,
                        cursor,
                        GROUP_MEMBERS_PAGE_SIZE
                    );
                    if (generation !== loadGeneration) return;

                    // Stop if the server returns no progress (defends against a bug
                    // returning `results:[], hasMore:true` which would loop forever).
                    if (page.results.length === 0) break;

                    const newAddrs: Address[] = [];
                    for (const row of page.results) {
                        const addr = row.member as Address;
                        const key = addr.toLowerCase();
                        if (addr.toLowerCase() === avatarAddress.toLowerCase()) continue;
                        if (seen.has(key)) continue;
                        seen.add(key);
                        newAddrs.push(addr);
                    }
                    rowsStore.update((prev) => prev.concat(newAddrs));
                    count = get(rowsStore).length;

                    if (first) {
                        loading = false;
                        first = false;
                    }
                    cursor = page.nextCursor;
                } while (cursor);
                return;
            }

            const trustDataSource = createTrustDataSource(sdk);
            const relations = await trustDataSource.getAggregatedTrustRelations(avatarAddress);
            if (generation !== loadGeneration) return;

            const filtered =
                relation === 'trusts'
                    ? relations.filter(
                          (row) => row.relation === 'trusts' || row.relation === 'mutuallyTrusts'
                      )
                    : relations.filter(
                          (row) => row.relation === 'trustedBy' || row.relation === 'mutuallyTrusts'
                      );
            const list = filtered
                .map((row) => row.objectAvatar as Address)
                .filter((addr) => addr !== avatarAddress);
            const unique = Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
            rowsStore.set(unique);
            count = unique.length;
        } catch (e) {
            if (generation !== loadGeneration) return;
            error = e instanceof Error ? e.message : 'Failed to load trust relations';
            rowsStore.set([]);
            count = 0;
        } finally {
            if (generation === loadGeneration) loading = false;
        }
    }

    $effect(() => {
        // re-run on avatarAddress / relation change
        avatarAddress;
        relation;
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
