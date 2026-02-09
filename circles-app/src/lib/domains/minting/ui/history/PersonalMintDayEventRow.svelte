<script lang="ts">
  import RowFrame from '$lib/shared/ui/RowFrame.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import type { EventHistoryListItem } from '$lib/domains/events/ui/history';

  type PersonalMintRow = {
    blockNumber: number;
    transactionIndex: number;
    logIndex: number;
    timestamp?: number;
    transactionHash?: string;
    human?: string;
    amount?: number | string;
    startPeriod?: number | string;
    endPeriod?: number | string;
  };

  interface Props {
    item: EventHistoryListItem<PersonalMintRow>;
  }

  let { item }: Props = $props();

  function formatTime(tsSec?: number): string {
    if (!tsSec) return 'Unknown time';
    return new Date(Number(tsSec) * 1000).toLocaleTimeString();
  }

  function shortHash(hash?: string): string {
    if (!hash) return 'Unknown tx';
    if (hash.length < 14) return hash;
    return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
  }

  function gnosisscanTxUrl(hash?: string): string {
    return `https://gnosisscan.io/tx/${hash ?? ''}`;
  }

  function formatAmount(value?: number | string): string {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n)) return String(value ?? '0');
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
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
      {#if item.row.human}
        <Avatar address={item.row.human} view="horizontal" clickable={true} showTypeInfo={true} />
      {:else}
        <div class="text-sm opacity-70">Unknown minter</div>
      {/if}
    </div>
    {#snippet trailing()}
      <div class="text-right text-[10px]">
        <div class="opacity-70">{formatTime(Number(item.row.timestamp ?? 0))}</div>
        <div class="opacity-60">Minted {formatAmount(item.row.amount)}</div>
      </div>
    {/snippet}
  </RowFrame>
{/if}
