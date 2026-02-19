<script lang="ts">
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import ProfilePage from '$lib/areas/profile/ui/pages/Profile.svelte';
  import { popupControls } from '$lib/shared/state/popup/popUp.svelte';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import type { Address } from '@aboutcircles/sdk-types';

  interface Props {
    address?: Address;
    trustRelation?: string;
  }
  let { address = '0x0' as Address, trustRelation = '' }: Props = $props();

  function openProfile() {
    popupControls.open({
      title: '',
      component: ProfilePage,
      props: { address },
    });
  }
</script>

<RowFrame clickable={true} dense={true} noLeading={true} onclick={openProfile}>
  <div class="min-w-0">
    <Avatar
      {address}
      view="horizontal"
      bottomInfo={trustRelation}
      clickable={false}
    />
  </div>
  {#snippet trailing()}
    <div aria-hidden="true">
      <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" />
    </div>
  {/snippet}
</RowFrame>
