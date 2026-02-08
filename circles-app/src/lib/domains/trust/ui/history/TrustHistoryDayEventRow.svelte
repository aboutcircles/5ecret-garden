<script lang="ts">
  import RowFrame from '$lib/shared/ui/RowFrame.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import type { TrustHistoryEventRow, TrustHistoryListItem } from './types';

  interface Props {
    item: TrustHistoryListItem;
  }

  let { item }: Props = $props();

  function eventType(r: TrustHistoryEventRow): string {
    return Number(r.expiryTime) > Number(r.timestamp) ? 'Trust set' : 'Trust removed';
  }

  function formatTime(tsSec: number): string {
    return new Date(tsSec * 1000).toLocaleTimeString();
  }

  function shortHash(hash?: string): string {
    if (!hash) return 'Unknown tx';
    if (hash.length < 14) return hash;
    return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
  }

  function gnosisscanTxUrl(hash?: string): string {
    return `https://gnosisscan.io/tx/${hash ?? ''}`;
  }
</script>

{#if item.kind === 'group'}
  <div class="px-3 pt-2 pb-1 sticky top-0 z-[1] bg-base-100 border-b border-base-300 flex items-start justify-between gap-2">
    <div class="min-w-0">
      <div class="text-xs font-medium truncate" title={item.transactionHash ?? 'Unknown tx'}>
        {shortHash(item.transactionHash)}
      </div>
      <div class="text-[10px] opacity-60">
        Block {item.blockNumber} · Tx #{item.transactionIndex} · {item.count} event{item.count === 1 ? '' : 's'}
      </div>
    </div>
    <a
      class="inline-flex items-center justify-center w-7 h-7 rounded-md bg-base-200 hover:bg-base-300 border border-base-300 shrink-0"
      href={gnosisscanTxUrl(item.transactionHash)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open transaction on Gnosisscan"
      title="Open on Gnosisscan"
    >
      <img src="/external.svg" alt="" class="w-3.5 h-3.5 opacity-80" aria-hidden="true" />
    </a>
  </div>
{:else}
  <RowFrame dense={true} noLeading={true}>
    <div class="min-w-0">
      <Avatar address={item.row.trustee} view="horizontal" clickable={true} showTypeInfo={true} />
    </div>
    {#snippet trailing()}
      <div class="text-right text-[10px]">
        <div class="opacity-70">{formatTime(Number(item.row.timestamp))}</div>
        <div class="opacity-60">{eventType(item.row)}</div>
      </div>
    {/snippet}
  </RowFrame>
{/if}
