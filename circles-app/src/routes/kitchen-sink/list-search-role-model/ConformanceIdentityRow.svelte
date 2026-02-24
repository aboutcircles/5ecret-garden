<script lang="ts">
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import type { Address } from '@circles-sdk/utils';

  type AvatarType = 'CrcV2_RegisterHuman' | 'CrcV2_RegisterOrganization' | 'CrcV2_RegisterGroup';

  export interface ConformanceIdentityRowItem {
    id: string;
    name: string;
    address: Address;
    avatarType: AvatarType;
    subtitle: string;
  }

  interface Props {
    item: ConformanceIdentityRowItem;
  }

  let { item }: Props = $props();

  const iconUrl = $derived.by(() =>
    item.avatarType === 'CrcV2_RegisterGroup'
      ? '/group.svg'
      : item.avatarType === 'CrcV2_RegisterOrganization'
        ? '/organization.svg'
        : '/person.svg'
  );
</script>

<RowFrame clickable={true} dense={true} noLeading={true}>
  <div class="w-full flex items-center justify-between gap-3">
    <div class="min-w-0 flex items-center gap-2">
      <img src={iconUrl} alt="" class="h-7 w-7 rounded-full opacity-80" />
      <div class="min-w-0">
        <div class="truncate text-sm font-medium">{item.name}</div>
        <div class="truncate text-xs opacity-70">{item.subtitle} • {item.address}</div>
      </div>
    </div>
    <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-50" />
  </div>
</RowFrame>
