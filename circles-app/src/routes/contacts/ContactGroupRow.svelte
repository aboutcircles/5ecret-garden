<script lang="ts">
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import ProfilePage from '$lib/pages/Profile.svelte';
  import { popupControls } from '$lib/stores/popUp';
  import type { Address } from '@circles-sdk/utils';

  interface Props {
    address?: Address | undefined;
    trustRelation?: string;
  }

  let { address, trustRelation = '' }: Props = $props();
</script>

<div class="w-full pt-2">
  <button
    class="w-full flex items-center justify-between p-2 hover:bg-black/5 rounded-lg"
    onclick={(e) => {
      popupControls.open({
        component: ProfilePage,
        title: '',
        props: {
          address: address,
        },
      });
      e.preventDefault();
      return true;
    }}
  >
    <Avatar
      {address}
      view="horizontal"
      bottomInfo={trustRelation}
      clickable={false}
    />
    <div class="font-medium underline flex gap-x-2">
      <img src="/chevron-right.svg" alt="Chevron Right" class="w-4" />
    </div>
  </button>
</div>
