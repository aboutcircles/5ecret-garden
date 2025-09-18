<script lang="ts">
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import ProfilePage from '$lib/pages/Profile.svelte';
  import { popupControls } from '$lib/stores/popUp';
  import Lucide from '$lib/icons/Lucide.svelte';
  import { ChevronRight as LChevronRight } from 'lucide';

  interface Props {
    address?: string;
    trustRelation?: string;
  }

  let { address = '', trustRelation = '' }: Props = $props();
</script>

<div class="w-full pt-2">
  <button
    class="w-full flex items-center justify-between p-2 hover:bg-base-200 rounded-lg"
    onclick={(e) => {
      popupControls.open({
        component: ProfilePage,
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
    <Lucide icon={LChevronRight} size={20} class="shrink-0 stroke-black" ariaLabel="" />
  </button>
</div>
