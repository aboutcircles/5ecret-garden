<script lang="ts">
  import { shortenAddress } from '$lib/utils/shared';
  import type { AvatarRow } from '@circles-sdk/data';
  import Avatar from './avatar/Avatar.svelte';

  export let item: AvatarRow;

  function avatarTypeToString(
    type:
      | 'CrcV2_RegisterHuman'
      | 'CrcV2_RegisterGroup'
      | 'CrcV2_RegisterOrganization'
      | 'CrcV1_Signup'
      | 'CrcV1_OrganizationSignup'
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
  <Avatar address={item.avatar} clickable={false} view="horizontal">
    {avatarTypeToString(item.type)} -
    {shortenAddress(item.avatar)}
  </Avatar>
  <div class="font-medium underline flex gap-x-2">
    See details <img src="/chevron-right.svg" alt="Chevron Right" class="w-4" />
  </div>
</div>
