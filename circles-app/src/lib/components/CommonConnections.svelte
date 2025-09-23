<script lang="ts">
    import RowFrame from '$lib/ui/RowFrame.svelte';
    import Avatar from '$lib/components/avatar/Avatar.svelte';
    import { popupControls } from '$lib/stores/popUp';
    import ProfilePage from '$lib/pages/Profile.svelte';
    import { avatarState } from '$lib/stores/avatar.svelte';
    import { circles } from '$lib/stores/circles';
    import type { Address } from '@circles-sdk/utils';

    interface Props {
        otherAvatarAddress?: Address;
        commonConnectionsCount?: number;
    }
    let { otherAvatarAddress, commonConnectionsCount = $bindable(0) }: Props = $props();

    let loading = $state(true);
    let error: string | null = $state(null);
    let rows: Address[] = $state([]);

    async function loadCommon(): Promise<void> {
        loading = true; error = null; rows = [];
        try {
            const me = avatarState.avatar?.address as Address | undefined;
            const other = otherAvatarAddress;
            if (!$circles || !me || !other) { loading = false; commonConnectionsCount = 0; return; }

            const good = new Set(['trusts', 'mutuallyTrusts']);
            const [mine, theirs] = await Promise.all([
                $circles.data.getAggregatedTrustRelations(me),
                $circles.data.getAggregatedTrustRelations(other)
            ]);
            const mySet = new Set(mine.filter(r => good.has(r.relation)).map(r => r.objectAvatar));
            const theirSet = new Set(theirs.filter(r => good.has(r.relation)).map(r => r.objectAvatar));

            const list: Address[] = [];
            for (const a of mySet) { if (theirSet.has(a) && a !== me && a !== other) list.push(a as Address); }
            list.sort((a, b) => a.localeCompare(b));

            rows = list;
            commonConnectionsCount = rows.length;
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to load connections';
            rows = []; commonConnectionsCount = 0;
        } finally { loading = false; }
    }
    $effect(() => { void loadCommon(); });

    function openProfile(addr: Address): void {
        popupControls.open({ component: ProfilePage, props: { address: addr } });
    }
</script>

{#if loading}
    <div class="w-full py-6 text-center text-base-content/60">Loading…</div>
{:else if error}
    <div class="w-full py-6 text-center text-error">{error}</div>
{:else if rows.length === 0}
    <div class="w-full py-6 text-center text-base-content/60">No common connections</div>
{:else}
    <div class="w-full flex flex-col gap-y-1.5">
        {#each rows as addr (addr)}
            <RowFrame clickable={true} dense={true} noLeading={true} on:click={() => openProfile(addr)}>
                <div class="min-w-0">
                    <Avatar address={addr} view="horizontal" clickable={false} />
                </div>
                <div slot="trailing" aria-hidden="true">
                    <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" />
                </div>
            </RowFrame>
        {/each}
    </div>
{/if}
