<script lang="ts">
  import type { TransactionHistoryRow } from '@circles-sdk/data';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';

  interface Props { item: TransactionHistoryRow }
  let { item }: Props = $props();

  const dateTime = $derived(new Date(item.timestamp).toLocaleString());

  const sent = $derived(() => {
    const me = avatarState.avatar?.address?.toLowerCase();
    return me ? item.from.toLowerCase() === me : false;
  });

  function formatAmount(v: number): string {
    const abs = Math.abs(v);
    return abs < 0.01 ? '< 0.01' : abs.toFixed(2);
  }

  const amountText = $derived(`${formatAmount(item.circles)} CRC`);

  function openOnExplorer() {
    const url = `https://gnosisscan.com/tx/${item.transactionHash}`;
    // Fallback to old domain if needed
    const alt = `https://gnosisscan.io/tx/${item.transactionHash}`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function copyHash() {
    navigator.clipboard?.writeText(item.transactionHash).catch(() => {});
  }
</script>

<div class="flex flex-col gap-4 w-full max-w-[min(92vw,48rem)]">
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="card bg-base-100 border shadow-sm">
      <div class="card-body p-4">
        <div class="text-sm opacity-70 mb-2">Sender</div>
        <Avatar address={item.from} view="horizontal" clickable={true} />
      </div>
    </div>
    <div class="card bg-base-100 border shadow-sm">
      <div class="card-body p-4">
        <div class="text-sm opacity-70 mb-2">Receiver</div>
        <Avatar address={item.to} view="horizontal" clickable={true} />
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div class="stat bg-base-100 border rounded-xl">
      <div class="stat-title">Amount</div>
      <div class="stat-value text-base-content text-2xl">{amountText}</div>
      {#if avatarState.avatar}
        <div class="stat-desc">{sent ? 'You sent this' : 'You received this'}</div>
      {/if}
    </div>
    <div class="stat bg-base-100 border rounded-xl">
      <div class="stat-title">Date & time</div>
      <div class="stat-value text-base-content text-xl">{dateTime}</div>
    </div>
    <div class="stat bg-base-100 border rounded-xl">
      <div class="stat-title">Network</div>
      <div class="stat-value text-base-content text-xl">Gnosis</div>
      <div class="stat-desc">Chain ID 100</div>
    </div>
  </div>

  <div class="bg-base-100 border rounded-xl p-4 flex items-center justify-between gap-3">
    <div class="min-w-0">
      <div class="text-sm opacity-70">Transaction hash</div>
      <div class="font-mono text-xs truncate" title={item.transactionHash}>{item.transactionHash}</div>
    </div>
    <div class="flex items-center gap-2 shrink-0">
      <button class="btn btn-xs btn-ghost" onclick={copyHash}>Copy</button>
      <button class="btn btn-xs btn-primary" onclick={openOnExplorer}>Open on Gnosisscan</button>
    </div>
  </div>
</div>
