<script lang="ts">
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import ProfilePopup from '$lib/pages/ProfilePopup.svelte';
  import { popupControls } from '$lib/stores/popup';
  import RowFrame from '$lib/ui/RowFrame.svelte';
  import { formatTrustRelation } from '$lib/utils/helpers';
  import type { AvatarSearchItem } from './avatarSearch.types';

  interface Props {
    item: AvatarSearchItem;
  }

  let { item }: Props = $props();

  function openProfile() {
    popupControls.open?.({ component: ProfilePopup, props: { address: item.address } });
  }

  let bottomInfo: string = $derived(item.trustRelation ? formatTrustRelation(item.trustRelation as any) : '');
</script>

<RowFrame clickable={true} dense={true} noLeading={true} onclick={openProfile}>
  <div class="min-w-0">
    <Avatar
      address={item.address}
      view="horizontal"
      bottomInfo={bottomInfo}
      showTypeInfo={true}
      showBookmarkBadge={item.isBookmarked}
      clickable={true}
    />
  </div>
  {#snippet trailing()}<div aria-hidden="true">
    <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" aria-hidden="true" />
  </div>{/snippet}
</RowFrame>
