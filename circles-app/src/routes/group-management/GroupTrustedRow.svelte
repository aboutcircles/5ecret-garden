<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';

  interface Props {
    item: Address;
    selected: boolean;
    onToggle: (address: Address, checked: boolean) => void;
  }

  let { item, selected, onToggle }: Props = $props();
</script>

<RowFrame clickable={false} dense={true} noLeading={true}>
  <div class="min-w-0">
    <Avatar address={item} view="horizontal" clickable={true} />
  </div>
  {#snippet trailing()}
    <input
      type="checkbox"
      class="checkbox checkbox-sm"
      checked={selected}
      onchange={(e) => onToggle(item, (e.currentTarget as HTMLInputElement).checked)}
    />
  {/snippet}
</RowFrame>
