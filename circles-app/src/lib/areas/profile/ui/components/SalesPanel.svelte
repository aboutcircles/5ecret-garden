<script lang="ts">
  import type { PaymentRow } from '$lib/shared/data/circles/paymentReceived';
  import { formatCrcAmount } from '$lib/shared/data/circles/paymentReceived';
  import { getCrcPrice, applyCrcRate, type CrcPrice } from '$lib/shared/data/market/crcPricing';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';
  import type { Address } from '@aboutcircles/sdk-types';

  interface Props {
    payments: PaymentRow[];
    loading?: boolean;
    error?: string;
    onRetry?: () => void;
  }

  let { payments, loading = false, error = '', onRetry }: Props = $props();

  // Stats: synchronous (count, CRC volume, unique buyers).
  const totalPaymentsCount = $derived(payments.length);
  const totalCrc = $derived(
    payments.reduce((sum, p) => sum + parseFloat(formatCrcAmount(p.amount)), 0)
  );
  const uniqueBuyers = $derived(new Set(payments.map((p) => p.payer.toLowerCase())).size);

  // Stats: async EUR volume — bucket by date, fetch one rate per date.
  let eurVolume: number | null = $state(null);
  let eurUsedFallback: boolean = $state(false);
  let eurAvailable: boolean = $state(false);
  let eurComputing: boolean = $state(false);
  let computedFor: string = $state('');

  $effect(() => {
    const fingerprint = payments.length
      ? `${payments[0].tx}:${payments[payments.length - 1].tx}:${payments.length}`
      : 'empty';
    if (computedFor === fingerprint) return;
    computedFor = fingerprint;
    void computeEurVolume();
  });

  async function computeEurVolume(): Promise<void> {
    eurAvailable = false;
    eurUsedFallback = false;
    eurVolume = null;
    if (payments.length === 0) return;
    eurComputing = true;
    try {
      // bucket: dateStr -> sum of CRC for that day
      const buckets: Record<string, { crc: number; ts: number }> = {};
      for (const p of payments) {
        if (!isFinite(p.timestamp) || p.timestamp <= 0) continue;
        const dateStr = new Date(p.timestamp * 1000).toISOString().slice(0, 10);
        if (!buckets[dateStr]) buckets[dateStr] = { crc: 0, ts: p.timestamp };
        buckets[dateStr].crc += parseFloat(formatCrcAmount(p.amount));
      }
      let total = 0;
      let hasAny = false;
      let usedFallback = false;
      for (const dateStr of Object.keys(buckets)) {
        const bucket = buckets[dateStr];
        const price: CrcPrice | null = await getCrcPrice(bucket.ts);
        const conv = applyCrcRate(bucket.crc, price);
        if (conv) {
          total += conv.eur;
          hasAny = true;
          if (conv.usedFallback) usedFallback = true;
        }
      }
      eurAvailable = hasAny;
      eurUsedFallback = usedFallback;
      eurVolume = hasAny ? total : null;
    } catch (e) {
      console.warn('[SalesPanel] EUR volume computation failed', e);
      eurAvailable = false;
      eurVolume = null;
    } finally {
      eurComputing = false;
    }
  }

  function formatTimestamp(ts: number): string {
    if (!ts) return '';
    return new Date(ts * 1000).toLocaleString();
  }

  function formatCrcDisplay(amount: bigint): string {
    const v = parseFloat(formatCrcAmount(amount));
    return v.toFixed(2);
  }

  function explorerUrl(tx: string): string {
    return `https://gnosisscan.io/tx/${tx}`;
  }

  function openPayer(address: Address): void {
    openProfilePopup(address);
  }
</script>

{#if loading}
  <div class="flex items-center gap-2 text-base-content/70 py-2">
    <span class="loading loading-spinner loading-sm"></span>
    <span>Loading sales…</span>
  </div>
{:else if error}
  <div class="alert alert-warning">
    <span>{error}</span>
    {#if onRetry}
      <button class="btn btn-xs ml-2" onclick={onRetry}>Retry</button>
    {/if}
  </div>
{:else if payments.length === 0}
  <div class="text-sm opacity-70">No sales</div>
{:else}
  <!-- Stats -->
  <div class="flex flex-wrap gap-2 mb-3">
    <div class="bg-base-200 rounded-lg px-3 py-2 min-w-[100px]">
      <div class="text-xs opacity-60">Sales</div>
      <div class="text-lg font-bold tabular-nums">{totalPaymentsCount}</div>
    </div>
    <div class="bg-base-200 rounded-lg px-3 py-2 min-w-[120px]">
      <div class="text-xs opacity-60">Volume</div>
      <div class="text-lg font-bold tabular-nums">{totalCrc.toFixed(2)} CRC</div>
    </div>
    <div class="bg-base-200 rounded-lg px-3 py-2 min-w-[120px]">
      <div class="text-xs opacity-60">EUR volume</div>
      <div class="text-lg font-bold tabular-nums">
        {#if eurComputing}
          …
        {:else if eurAvailable && eurVolume !== null}
          {eurUsedFallback ? '~' : ''}€{eurVolume.toFixed(2)}
        {:else}
          —
        {/if}
      </div>
      {#if eurUsedFallback}
        <div class="text-[10px] opacity-50 mt-0.5">partial xDAI fallback</div>
      {/if}
    </div>
    <div class="bg-base-200 rounded-lg px-3 py-2 min-w-[100px]">
      <div class="text-xs opacity-60">Buyers</div>
      <div class="text-lg font-bold tabular-nums">{uniqueBuyers}</div>
    </div>
  </div>

  <!-- Payment list -->
  <div class="space-y-1.5">
    {#each payments as p (p.tx)}
      <RowFrame dense={true} noLeading={true}>
        <button
          type="button"
          class="min-w-0 text-left w-full"
          onclick={() => openPayer(p.payer)}
          aria-label={`Open buyer ${p.payer}`}
        >
          <Avatar address={p.payer} clickable={true} view="horizontal" showTypeInfo={true} />
        </button>
        {#snippet trailing()}
          <div class="text-right tabular-nums whitespace-nowrap">
            <div class="font-medium">{formatCrcDisplay(p.amount)} CRC</div>
            <div class="text-xs opacity-60">{formatTimestamp(p.timestamp)}</div>
            {#if p.tx}
              <a
                class="text-[10px] opacity-50 hover:underline"
                href={explorerUrl(p.tx)}
                target="_blank"
                rel="noopener noreferrer"
              >
                tx ↗
              </a>
            {/if}
          </div>
        {/snippet}
      </RowFrame>
    {/each}
  </div>
{/if}
