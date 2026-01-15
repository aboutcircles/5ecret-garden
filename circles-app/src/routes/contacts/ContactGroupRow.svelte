<script lang="ts">
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import ProfilePage from '$lib/pages/Profile.svelte';
  import { popupControls } from '$lib/stores/popUp.svelte';
  import RowFrame from '$lib/ui/RowFrame.svelte';
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

<RowFrame clickable={true} dense={true} noLeading={true} on:click={openProfile}>
  <div class="min-w-0">
    <Avatar
      {address}
      view="horizontal"
      bottomInfo={trustRelation}
      clickable={false}
    />
  </div>
  <div slot="trailing" aria-hidden="true">
    <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" />
  </div>
</RowFrame>
