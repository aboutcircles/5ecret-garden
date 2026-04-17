<script lang="ts">
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import type { TrustHistoryEventRow } from './types';

  interface Props {
    dayStartSec: number;
    dayEndSec: number;
    events: TrustHistoryEventRow[];
  }

  let { events }: Props = $props();
  const originAddress = $derived(events[0]?.truster);
</script>

{#if originAddress}
  <div>
    <div class="text-xs opacity-60 mb-1">Trust originated from</div>
    <Avatar address={originAddress} view="horizontal" clickable={true} showTypeInfo={true} />
  </div>
{/if}
