<script lang="ts">
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import type { TrustHistoryEventRow, TrustHistoryListItem } from './types';
  import { T } from '$lib/design-system/tokens.js';

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
  <div style="padding:8px 12px 4px;position:sticky;top:0;z-index:1;background:{T.surface};border-bottom:1px solid {T.hairlineSoft};display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
    <div style="min-width:0;">
      <div style="font-size:11px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:{T.ink};" title={item.transactionHash ?? 'Unknown tx'}>
        {shortHash(item.transactionHash)}
      </div>
      <div style="font-size:10px;opacity:0.6;color:{T.inkMuted};">
        Block {item.blockNumber} · Tx #{item.transactionIndex} · {item.count} event{item.count === 1 ? '' : 's'}
      </div>
    </div>
    <a
      style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:{T.pageDeep};border:1px solid {T.hairlineSoft};flex-shrink:0;text-decoration:none;"
      href={gnosisscanTxUrl(item.transactionHash)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open transaction on Gnosisscan"
      title="Open on Gnosisscan"
    >
      <img src="/external.svg" alt="" style="width:14px;height:14px;opacity:0.8;" aria-hidden="true" />
    </a>
  </div>
{:else}
  <div style="display:flex;align-items:center;gap:12px;padding:8px 14px;border-radius:12px;background:{T.surface};border:1px solid {T.hairlineSoft};">
    <div style="flex:1;min-width:0;">
      <Avatar address={item.row.trustee} view="horizontal" clickable={true} showTypeInfo={true} />
    </div>
    <div style="text-align:right;font-size:10px;flex-shrink:0;">
      <div style="opacity:0.7;color:{T.inkBody};">{formatTime(Number(item.row.timestamp))}</div>
      <div style="opacity:0.6;color:{T.inkMuted};">{eventType(item.row)}</div>
    </div>
  </div>
{/if}
