<script lang="ts">
  import RowFrame from '$lib/ui/RowFrame.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import type { TrustRow as TrustRowType } from './types';

  interface Props {
    item: TrustRowType;
  }

  let { item }: Props = $props();

  const expiryLabel = $derived(() =>
    item.expiry ? new Date(Number(item.expiry) * 1000).toLocaleString() : ''
  );

  const isActive = $derived(() => Number(item.expiry) * 1000 > Date.now());
</script>

<RowFrame clickable={false} dense={true} noLeading={true}>
  <div class="w-full flex items-center justify-between gap-3">
    <div class="min-w-0 flex items-center gap-2">
      <Avatar address={item.trustReceiver} view="horizontal" clickable={true} />
      <div class="flex flex-col min-w-0">
        <div class="font-mono text-xs truncate">{item.trustReceiver}</div>
        <div class="text-xs text-base-content/70">{expiryLabel}</div>
      </div>
    </div>

    <div class="flex flex-col items-end gap-1 text-right shrink-0">
      <div>
        {#if isActive}
          <span class="badge badge-success">active</span>
        {:else}
          <span class="badge">expired</span>
        {/if}
      </div>
    </div>
  </div>
</RowFrame>
