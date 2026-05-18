<script lang="ts">
    import SearchablePaginatedAddressList from '$lib/shared/ui/profile/components/SearchablePaginatedAddressList.svelte';
    import { circles } from '$lib/shared/state/circles';
    import { get, writable } from 'svelte/store';
    import type { Address } from '@aboutcircles/sdk-types';
    import { createTrustDataSource } from '$lib/shared/data/circles/trustDataSource';
    import { createGroupDataSource } from '$lib/shared/data/circles/groupDataSource';
    import { isGroupType } from '$lib/shared/utils/avatarHelpers';
    import { getProfilesCoreBatch } from '$lib/shared/utils/profile';
    import type { ProfileAddress } from '$lib/shared/model/profile';

    type RelationFilter = 'trusts' | 'trustedBy';

    interface Props {
        avatarAddress?: Address;
        relation: RelationFilter;
        count?: number;
    }

    let { avatarAddress, relation, count = $bindable(0) }: Props = $props();

    // Match the transaction-history page size so the Trusts tab renders
    // its first batch of members quickly; remaining pages stream in via
    // VirtualList's scroll-driven prefetch.
    const GROUP_MEMBERS_PAGE_SIZE = 25;

    let loading = $state(true);
    let error: string | null = $state(null);
    const rowsStore = writable<Address[]>([]);
    let loadGeneration = 0;
    let totalKnownCount: number | undefined = $state(undefined);

    // Scroll-driven lazy pagination for the group "Trusts" tab. Without this,
    // the popup eagerly fired one page RPC per 25 members (76 calls for a
    // 1903-member group) and each member's Avatar then queued an independent
    // profile fetch — a multi-thousand-request storm. Now we fetch exactly the
    // first page, prime the shared profile cache via getProfilesCoreBatch
    // (so Avatar mounts hit cache instead of queueing), and let VirtualList
    // ask for more pages as the user scrolls.
    let cursor: string | null = null;
    let exhausted = $state(false);
    let groupFetcher: (() => Promise<boolean>) | null = null;

    async function loadGroupNextPage(generation: number): Promise<boolean> {
        if (exhausted) return false;
        if (generation !== loadGeneration) return false;
        const sdk = get(circles);
        if (!sdk || !avatarAddress) return false;

        const groupDataSource = createGroupDataSource(sdk);
        const page = await groupDataSource.getGroupMembersPage(
            avatarAddress,
            cursor,
            GROUP_MEMBERS_PAGE_SIZE
        );
        if (generation !== loadGeneration) return false;

        if (page.results.length === 0) {
            exhausted = true;
            cursor = null;
            return false;
        }

        const seen = new Set(get(rowsStore).map((a) => a.toLowerCase()));
        const newAddrs: Address[] = [];
        for (const row of page.results) {
            const addr = row.member as Address;
            const key = addr.toLowerCase();
            if (key === avatarAddress.toLowerCase()) continue;
            if (seen.has(key)) continue;
            seen.add(key);
            newAddrs.push(addr);
        }

        // Prime the shared profile cache for this page so the Avatars that are
        // about to mount don't each fire an individual fetch. Fire-and-forget —
        // Avatar's own getProfile() call will hit the cached promise when this
        // resolves (typically within milliseconds).
        if (newAddrs.length > 0) {
            void getProfilesCoreBatch(newAddrs as unknown as ProfileAddress[]).catch(() => {});
        }

        rowsStore.update((prev) => prev.concat(newAddrs));
        if (totalKnownCount === undefined) {
            count = get(rowsStore).length;
        }

        cursor = page.nextCursor;
        const hasMore = page.hasMore && cursor !== null;
        exhausted = !hasMore;
        return hasMore;
    }

    async function loadRelations(): Promise<void> {
        const generation = ++loadGeneration;
        loading = true;
        error = null;
        rowsStore.set([]);
        count = 0;
        totalKnownCount = undefined;
        cursor = null;
        exhausted = false;
        groupFetcher = null;

        try {
            const sdk = get(circles);
            if (!sdk || !avatarAddress) {
                loading = false;
                return;
            }

            const avatarInfo = await sdk.data.getAvatar(avatarAddress).catch((e) => {
                console.warn('[TrustRelationsList] getAvatar failed; defaulting to trust path', e);
                return null;
            });
            if (generation !== loadGeneration) return;
            const subjectIsGroup = isGroupType(avatarInfo?.type);

            if (relation === 'trusts' && subjectIsGroup) {
                const groupDataSource = createGroupDataSource(sdk);

                const total = await groupDataSource
                    .getGroupMemberCount(avatarAddress)
                    .catch((e) => {
                        console.warn('[TrustRelationsList] getGroupMemberCount failed', avatarAddress, e);
                        return null;
                    });
                if (generation !== loadGeneration) return;
                if (typeof total === 'number') {
                    totalKnownCount = total;
                    count = total;
                }

                groupFetcher = () => loadGroupNextPage(generation);
                await loadGroupNextPage(generation);
                if (generation !== loadGeneration) return;
                loading = false;
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
            exhausted = true;
        } catch (e) {
            if (generation !== loadGeneration) return;
            error = e instanceof Error ? e.message : 'Failed to load trust relations';
            rowsStore.set([]);
            count = 0;
            exhausted = true;
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

    // VirtualList-driven lazy load. For non-group trust paths (one-shot
    // fetch), groupFetcher is null and exhausted is true, so next() is a
    // no-op and VirtualList stops asking for more.
    const externalNext = async (): Promise<boolean> => {
        if (!groupFetcher) return false;
        return groupFetcher();
    };
</script>

<SearchablePaginatedAddressList
    addresses={rowsStore}
    loading={loading}
    {error}
    {totalKnownCount}
    next={externalNext}
    ended={exhausted}
    emptyLabel="No connections"
    noMatchesLabel="No matches"
/>
