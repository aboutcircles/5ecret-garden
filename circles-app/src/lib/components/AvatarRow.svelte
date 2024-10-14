<script lang="ts">
  import { shortenAddress } from '$lib/utils/shared';
  import Avatar from '$lib/components/Avatar.svelte';
  import type { AvatarRow } from '@circles-sdk/data';

  export let item: AvatarRow;

  function avatarTypeToString(
    type:
      | 'CrcV2_RegisterHuman'
      | 'CrcV2_RegisterGroup'
      | 'CrcV2_RegisterOrganization'
      | 'CrcV1_Signup'
  ): string {
    switch (type) {
      case 'CrcV2_RegisterHuman':
        return 'Human';
      case 'CrcV2_RegisterGroup':
        return 'Group';
      case 'CrcV2_RegisterOrganization':
        return 'Organization';
      case 'CrcV1_Signup':
        return 'Human (v1)';
      default:
        return 'Unknown';
    }
  }
</script>

<div
  class="flex items-center justify-between p-2 bg-base-100 hover:bg-base-200 rounded-lg"
>
  <Avatar address={item.avatar} clickable={false}>
    {avatarTypeToString(item.type)} -
    {shortenAddress(item.avatar)}
    <!--            TODO: Doesn't work well on mobile-->
    <!--            <a class="underline" href="https://gnosisscan.io/address/{item.avatar}" target="_blank" rel="noopener noreferrer">-->
    <!--            </a>-->
  </Avatar>
  <div class="font-medium underline flex gap-x-2">
    See details <img src="/chevron-right.svg" alt="Chevron Right" class="w-4" />
  </div>
</div>
