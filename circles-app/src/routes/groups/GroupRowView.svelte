<script lang="ts">
  import type { GroupRow } from '@circles-sdk/data';
  import {popupControls} from '$lib/components/PopUp.svelte';
  import ProfilePage from '$lib/pages/Profile.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';

  export let item: GroupRow;
</script>

<button
  class="w-full flex items-center justify-between p-4 bg-base-100 hover:bg-base-200"
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
  <Avatar address={item.group} view="horizontal">
    <span>{item.memberCount} member{`${item.memberCount === 1 ? '' : 's'}`}</span>
    <!-- <a class="underline" href={'https://gnosisscan.io/address/' + item.group}
      >({shortenAddress(item.group)})</a
    > -->
  </Avatar>
  <div class="font-medium underline flex gap-x-2">
   <img src="/chevron-right.svg" alt="Chevron Right" class="w-4" />
  </div>
</button>
