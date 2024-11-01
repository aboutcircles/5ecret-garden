<script lang="ts">
  import Avatar from '$lib/components/Avatar.svelte';
  import type { GroupRow } from '@circles-sdk/data';
  import { shortenAddress } from '$lib/utils/shared';
  import {popupControls} from '$lib/components/PopUp.svelte';
  import ProfilePage from '$lib/pages/Profile.svelte';

  export let item: GroupRow;
</script>

<button
  class="w-full flex items-center justify-between p-2 bg-base-100 hover:bg-base-200 rounded-lg"
  on:click={(e) => {
    $popupControls.open?.({
      component: ProfilePage,
      title: '',
      props: {
        address: item.group,
      },
    });
    e.preventDefault();
    return true;
  }}
>
  <Avatar address={item.group}>
    <span>{item.memberCount} Members</span>
    <a class="underline" href={'https://gnosisscan.io/address/' + item.group}
      >({shortenAddress(item.group)})</a
    >
  </Avatar>
  <div class="font-medium underline flex gap-x-2">
    See details <img src="/chevron-right.svg" alt="Chevron Right" class="w-4" />
  </div>
</button>
