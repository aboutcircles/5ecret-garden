<script lang="ts">
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { popupControls } from '$lib/shared/state/popup/popUp.svelte';
  import ProfilePage from '$lib/areas/profile/ui/pages/Profile.svelte';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { circles } from '$lib/shared/state/circles';
  import type { Address } from '@aboutcircles/sdk-types';
  import { getAggregatedTrustRelationsEnriched, type TrustRelationInfo } from '$lib/shared/utils/sdkHelpers';

  interface Props {
    otherAvatarAddress?: Address;
    commonConnectionsCount?: number;
  }
  let { otherAvatarAddress, commonConnectionsCount = $bindable(0) }: Props =
    $props();

  let loading = $state(true);
  let error: string | null = $state(null);
  let rows: TrustRelationInfo[] = $state([]);

  async function loadCommon(): Promise<void> {
    loading = true;
    error = null;
    rows = [];
    try {
      const me = avatarState.avatar?.address as Address | undefined;
      const other = otherAvatarAddress;
      if (!$circles || !me || !other) {
        loading = false;
        commonConnectionsCount = 0;
        return;
      }

      // Use enriched trust relations - includes avatar info in single call
      const [mine, theirs] = await Promise.all([
        getAggregatedTrustRelationsEnriched($circles, me),
        getAggregatedTrustRelationsEnriched($circles, other),
      ]);

      // Combine mutual + trusts (outgoing trust) for "good" relations
      // SDK may return undefined instead of empty arrays
      let myTrusted = (mine.results || []).filter((r: any) => r.relationType === 'mutual' || r.relationType === 'trusts');
      let theirTrusted = (theirs.results || []).filter((r: any) => r.relationType === 'mutual' || r.relationType === 'trusts');

      // Fallback: If enriched returns empty but user has trust relations (known backend bug)
      if (myTrusted.length === 0 && avatarState.avatar?.trust?.getAll) {
        try {
          const myFallback = await avatarState.avatar.trust.getAll();
          if (myFallback && myFallback.length > 0) {
            myTrusted = myFallback
              .filter((r: any) => r.relation === 'mutuallyTrusts' || r.relation === 'trusts')
              .map((r: any) => ({ address: r.objectAvatar as Address, relationType: r.relation === 'mutuallyTrusts' ? 'mutual' as const : 'trusts' as const }));
          }
        } catch {
          // Fallback failed — continue with empty list
        }
      }

      if (theirTrusted.length === 0) {
        try {
          // Get an avatar instance for the other address to access trust.getAll()
          const otherAvatar = await $circles.getAvatar(other);
          if (otherAvatar?.trust?.getAll) {
            const theirFallback = await otherAvatar.trust.getAll();
            if (theirFallback && theirFallback.length > 0) {
              theirTrusted = theirFallback
                .filter((r: any) => r.relation === 'mutuallyTrusts' || r.relation === 'trusts')
                .map((r: any) => ({ address: r.objectAvatar as Address, relationType: r.relation === 'mutuallyTrusts' ? 'mutual' as const : 'trusts' as const }));
            }
          }
        } catch {
          // Fallback failed — continue with empty list
        }
      }

      // SDK may return `objectAvatar` instead of `address` in some cases
      // CRITICAL: Normalize to lowercase for comparison - addresses can have different checksums
      const getAddr = (r: any) => (r.address || r.objectAvatar)?.toLowerCase();
      const mySet = new Set(myTrusted.map((r) => getAddr(r)));
      const theirMap = new Map(theirTrusted.map((r) => [getAddr(r), r]));

      const meLower = me?.toLowerCase();
      const otherLower = other?.toLowerCase();
      const list: TrustRelationInfo[] = [];
      for (const addr of mySet) {
        if (theirMap.has(addr) && addr !== meLower && addr !== otherLower) {
          // Use the enriched info from their relations (has avatar info)
          list.push(theirMap.get(addr)!);
        }
      }
      list.sort((a, b) => a.address.localeCompare(b.address));

      rows = list;
      commonConnectionsCount = rows.length;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load connections';
      rows = [];
      commonConnectionsCount = 0;
    } finally {
      loading = false;
    }
  }
  $effect(() => {
    // Read otherAvatarAddress synchronously to track it as a reactive dependency
    // (async functions don't track dependencies after awaits in Svelte 5)
    const addr = otherAvatarAddress;
    if (addr) {
      void loadCommon();
    }
  });

  function openProfile(addr: Address): void {
    popupControls.open({
      title: 'Profile',
      component: ProfilePage,
      props: { address: addr },
    });
  }
</script>

{#if loading}
  <div class="w-full py-6 text-center text-base-content/60">Loading…</div>
{:else if error}
  <div class="w-full py-6 text-center text-error">{error}</div>
{:else if rows.length === 0}
  <div class="w-full py-6 text-center text-base-content/60">
    No common connections
  </div>
{:else}
  <div class="w-full flex flex-col gap-y-1.5">
    {#each rows as relation (relation.address)}
      <RowFrame
        clickable={true}
        dense={true}
        noLeading={true}
        onclick={() => openProfile(relation.address)}
      >
        <div class="min-w-0">
          <Avatar address={relation.address} view="horizontal" clickable={false} />
        </div>
        {#snippet trailing()}
          <div aria-hidden="true">
            <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" />
          </div>
        {/snippet}
      </RowFrame>
    {/each}
  </div>
{/if}
