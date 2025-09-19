<script lang="ts">
  import type { GroupRow } from '@circles-sdk/data';
  import ProfilePage from '$lib/pages/Profile.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { popupControls } from '$lib/stores/popUp';
  import Lucide from '$lib/icons/Lucide.svelte';
  import { ChevronRight as LChevronRight } from 'lucide';

  interface Props {
    item: GroupRow;
  }

  let { item }: Props = $props();
</script>

<button
  class="w-full flex items-center justify-between p-2 hover:bg-base-200 rounded-lg"
  onclick={(e) => {
    popupControls.open({
      component: ProfilePage,
      props: {
        address: item.group,
      },
    });
    e.preventDefault();
    return true;
  }}
>
  <Avatar
    placeholderBottom={true}
    placeholderTop={false}
    placeholderAvatar={true}
    address={item.group}
    view="horizontal"
    clickable={false}
    bottomInfo={`${item.memberCount} member${item.memberCount === 1 ? '' : 's'}`}
  />
  <Lucide icon={LChevronRight} size={20} class="shrink-0 stroke-black" ariaLabel="" />
</button>
