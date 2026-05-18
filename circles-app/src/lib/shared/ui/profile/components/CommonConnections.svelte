<script lang="ts">
    import SearchablePaginatedAddressList from '$lib/shared/ui/profile/components/SearchablePaginatedAddressList.svelte';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import { circles } from '$lib/shared/state/circles';
    import { get, writable } from 'svelte/store';
    import type { Address } from '@aboutcircles/sdk-types';
    import { getProfilesCoreBatch } from '$lib/shared/utils/profile';
    import type { ProfileAddress } from '$lib/shared/model/profile';

    interface Props {
        otherAvatarAddress?: Address;
        commonConnectionsCount?: number;
    }
    let { otherAvatarAddress, commonConnectionsCount = $bindable(0) }: Props = $props();

    let loading = $state(false);
    let error: string | null = $state(null);
    const rowsStore = writable<Address[]>([]);
    let loadGeneration = 0;

    async function loadCommon(me: Address, other: Address): Promise<void> {
        const generation = ++loadGeneration;
        loading = true;
        error = null;
        rowsStore.set([]);

        try {
            const sdk = get(circles);
            if (!sdk?.rpc) throw new Error('No circles RPC available');

            const resp = await sdk.rpc.trust.getCommonTrust(me, other);
            if (generation !== loadGeneration) return;

            const meLower = me.toLowerCase();
            const otherLower = other.toLowerCase();
            const list = (resp ?? [])
                .map((addr: string) => addr as Address)
                .filter((addr: Address) => {
                    const a = addr.toLowerCase();
                    return a !== meLower && a !== otherLower;
                })
                .sort((a: string, b: string) => a.localeCompare(b));

            // Prime the profile cache so each Avatar in the list doesn't
            // fire its own fetch when mounting.
            if (list.length > 0) {
                void getProfilesCoreBatch(list as unknown as ProfileAddress[]).catch(() => {});
            }

            rowsStore.set(list);
            commonConnectionsCount = list.length;
        } catch (e) {
            if (generation !== loadGeneration) return;
            error = e instanceof Error ? e.message : 'Failed to load connections';
            rowsStore.set([]);
            commonConnectionsCount = 0;
        } finally {
            if (generation === loadGeneration) loading = false;
        }
    }

    $effect(() => {
        const me = avatarState.avatar?.address as Address | undefined;
        const other = otherAvatarAddress;
        const sdk = $circles;

        if (!sdk || !me || !other) {
            loadGeneration++;
            loading = false;
            rowsStore.set([]);
            commonConnectionsCount = 0;
            return;
        }

        void loadCommon(me, other);
    });
</script>

<SearchablePaginatedAddressList
    addresses={rowsStore}
    loading={loading}
    {error}
    emptyLabel="No common connections"
    noMatchesLabel="No matches"
/>
