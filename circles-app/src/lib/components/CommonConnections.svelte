<script lang="ts">
  import RowFrame from '$lib/ui/RowFrame.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { popupControls } from '$lib/stores/popUp.svelte';
  import ProfilePage from '$lib/pages/Profile.svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { circles } from '$lib/stores/circles';
  import type { Address, TrustRelationInfo } from '@aboutcircles/sdk-types';
  import { getAggregatedTrustRelationsEnriched } from '$lib/utils/sdkHelpers';

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
      const myTrusted = [...mine.mutual, ...mine.trusts];
      const theirTrusted = [...theirs.mutual, ...theirs.trusts];

      const mySet = new Set(myTrusted.map((r) => r.address));
      const theirMap = new Map(theirTrusted.map((r) => [r.address, r]));

      const list: TrustRelationInfo[] = [];
      for (const addr of mySet) {
        if (theirMap.has(addr) && addr !== me && addr !== other) {
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
    void loadCommon();
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
        on:click={() => openProfile(relation.address)}
      >
        <div class="min-w-0">
          <Avatar address={relation.address} view="horizontal" clickable={false} />
        </div>
        <div slot="trailing" aria-hidden="true">
          <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" />
        </div>
      </RowFrame>
    {/each}
  </div>
{/if}
