<script lang="ts">
  import { getTimeAgo } from '$lib/utils/shared';
  import type { GroupedTransaction } from '$lib/stores/transactionHistory';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import RowFrame from '$lib/ui/RowFrame.svelte';

  interface Props {
    item: GroupedTransaction;
  }
  let { item }: Props = $props();

  let expanded = $state(false);

  function formatNetCircles(amount: number): string {
    const abs = Math.abs(amount);
    return abs < 0.01 ? '< 0.01' : abs.toFixed(2);
  }

  function openTx() {
    const url = 'https://gnosisscan.io/tx/' + item.transactionHash;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function toggleExpand() {
    if (item.eventCount > 1) {
      expanded = !expanded;
    }
  }

  const isSent = $derived(item.netCircles < 0);
  const displayAmount = $derived(
    `${isSent ? '-' : '+'}${formatNetCircles(item.netCircles)}`
  );

  function getBadgeUrl(type: GroupedTransaction['type']): string | null {
    switch (type) {
      case 'mint':
        return '/badge-mint.svg';
      case 'burn':
        return '/badge-burn.svg';
      case 'send':
        return '/badge-sent.svg';
      case 'receive':
        return '/badge-received.svg';
      default:
        return isSent ? '/badge-sent.svg' : '/badge-received.svg';
    }
  }
</script>

<div class="w-full">
  <!-- Main collapsed row -->
  <RowFrame clickable={item.eventCount > 1} dense={true} noLeading={true} on:click={toggleExpand}>
    <div class="w-full flex items-center justify-between">
      <div class="min-w-0 flex items-center gap-2">
        <Avatar
          address={item.counterparty}
          view="horizontal"
          clickable={true}
          pictureOverlayUrl={getBadgeUrl(item.type) ?? undefined}
          topInfo={''}
          bottomInfo={getTimeAgo(item.timestamp)}
        />
        {#if item.eventCount > 1}
          <span
            class="badge badge-sm badge-ghost cursor-pointer"
            title="Click to expand {item.eventCount} events"
          >
            {item.eventCount} hops
          </span>
        {/if}
      </div>

      <div class="flex items-center gap-2">
        <div class="text-right shrink-0">
          {#if isSent}
            <span class="text-error font-bold">{displayAmount}</span>
          {:else}
            <span class="text-success font-bold">{displayAmount}</span>
          {/if}
          <span> CRC</span>
        </div>
        <button
          class="btn btn-ghost btn-xs btn-circle"
          onclick={(e) => { e.stopPropagation(); openTx(); }}
          title="View on block explorer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
      </div>
    </div>
  </RowFrame>

  <!-- Expanded events drill-down -->
  {#if expanded && item.eventCount > 1}
    <div class="ml-6 pl-4 border-l-2 border-base-300 space-y-1 py-2">
      {#each item.events as event, idx}
        {@const isFromUser = event.from.toLowerCase() === item.counterparty.toLowerCase()}
        <div class="flex items-center justify-between text-sm opacity-80 py-1 px-2 rounded hover:bg-base-200">
          <div class="flex items-center gap-2">
            <span class="text-xs text-base-content/50">#{idx + 1}</span>
            <span class="font-mono text-xs truncate max-w-[100px]" title={event.from}>
              {event.from.slice(0, 6)}...{event.from.slice(-4)}
            </span>
            <span class="text-base-content/50">→</span>
            <span class="font-mono text-xs truncate max-w-[100px]" title={event.to}>
              {event.to.slice(0, 6)}...{event.to.slice(-4)}
            </span>
          </div>
          <span class="tabular-nums">
            {(event.circles ?? 0).toFixed(2)} CRC
          </span>
        </div>
      {/each}
    </div>
  {/if}
</div>
