<script lang="ts">
  import { shortenAddress } from '$lib/utils/shared';
  import type { AvatarRow } from '@circles-sdk/data';
  import Avatar from './avatar/Avatar.svelte';
  import { getTypeString } from '$lib/utils/helpers';

  export let item: AvatarRow;
</script>

<div
  class="flex items-center justify-between p-2 bg-base-100 hover:bg-base-200 rounded-lg"
>
  <Avatar address={item.avatar} clickable={false} view="horizontal" bottomInfo={getTypeString(item.type) +
    ' - ' + shortenAddress(item.avatar)} />
    
  <div class="font-medium underline flex gap-x-2">
    See details <img src="/chevron-right.svg" alt="Chevron Right" class="w-4" />
  </div>
</div>
