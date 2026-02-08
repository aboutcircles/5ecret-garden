<script lang="ts">
  import RowFrame from '$lib/ui/RowFrame.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import type { TrustHistoryEventRow } from './types';

  interface Props {
    item: TrustHistoryEventRow;
  }

  let { item }: Props = $props();

  function eventType(r: TrustHistoryEventRow): string {
    return Number(r.expiryTime) > Number(r.timestamp) ? 'Trust set' : 'Trust removed';
  }

  function formatTime(tsSec: number): string {
    return new Date(tsSec * 1000).toLocaleTimeString();
  }
</script>

<RowFrame dense={true} noLeading={true}>
  <div class="min-w-0">
    <Avatar address={item.trustee} view="horizontal" clickable={true} showTypeInfo={true} />
  </div>
  {#snippet trailing()}
    <div class="text-right text-[10px]">
      <div class="opacity-70">{formatTime(Number(item.timestamp))}</div>
      <div class="opacity-60">{eventType(item)}</div>
    </div>
  {/snippet}
</RowFrame>
