<script lang="ts">
    import SearchablePaginatedAddressList from '$lib/shared/ui/profile/components/SearchablePaginatedAddressList.svelte';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import { circles } from '$lib/shared/state/circles';
    import { get, writable } from 'svelte/store';
    import type { Address } from '@aboutcircles/sdk-types';

    interface Props {
        otherAvatarAddress?: Address;
        commonConnectionsCount?: number;
    }
    let { otherAvatarAddress, commonConnectionsCount = $bindable(0) }: Props = $props();

    let loading = $state(true);
    let error: string | null = $state(null);
    let rows: Address[] = $state([]);
    const rowsStore = writable<Address[]>([]);

    async function loadCommon(): Promise<void> {
        loading = true; error = null; rows = [];
        try {
            const me = avatarState.avatar?.address as Address | undefined;
            const other = otherAvatarAddress;
            if (!$circles || !me || !other) { loading = false; commonConnectionsCount = 0; return; }

            const sdk = get(circles);
            if (!sdk?.rpc) {
                throw new Error('No circles RPC available');
            }
            const resp = await sdk.rpc.trust.getCommonTrust(me, other);
            const list = (resp ?? [])
                .map((addr: string) => addr as Address)
                .filter((addr: Address) => addr !== me && addr !== other)
                .sort((a: string, b: string) => a.localeCompare(b));

            rows = list;
            rowsStore.set(rows);
            commonConnectionsCount = rows.length;
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to load connections';
            rows = []; rowsStore.set([]); commonConnectionsCount = 0;
        } finally { loading = false; }
    }

    $effect(() => { void loadCommon(); });
</script>

<SearchablePaginatedAddressList
    addresses={rowsStore}
    loading={loading}
    {error}
    emptyLabel="No common connections"
    noMatchesLabel="No matches"
/>
