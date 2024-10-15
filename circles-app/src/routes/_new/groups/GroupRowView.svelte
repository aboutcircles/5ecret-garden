<script lang="ts">
  import Avatar from '$lib/components/Avatar.svelte';
  import type { GroupRow } from '@circles-sdk/data';
  import { shortenAddress } from '$lib/utils/shared';

  export let item: GroupRow;
</script>

<div
  class="flex items-center justify-between p-2 bg-base-100 hover:bg-base-200 rounded-lg"
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
</div>
