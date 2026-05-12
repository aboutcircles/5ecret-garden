<script lang="ts">
  import type { PaymentRow } from '$lib/shared/data/circles/paymentReceived';
  import { formatCrcAmount } from '$lib/shared/data/circles/paymentReceived';
  import ModernHistoryChart from '$lib/areas/groups/ui/components/ModernHistoryChart.svelte';

  interface Props {
    payments: PaymentRow[];
    loading?: boolean;
    error?: string;
  }

  let { payments, loading = false, error = '' }: Props = $props();

  type SkuPoint = { timestamp: Date; price: number };
  type SkuBucket = { key: string; label: string; series: SkuPoint[] };

  /**
   * Extract a SKU/reference key from a payment's data field.
   * Returns the JSON `sku` or `productSku` if present, else the trimmed decoded string,
   * else "(unknown)" when nothing is decodable.
   */
  function extractSkuKey(decoded: string): { key: string; label: string } {
    if (!decoded) return { key: '__unknown__', label: '(unknown)' };
    const trimmed = decoded.trim();
    if (!trimmed) return { key: '__unknown__', label: '(unknown)' };
    try {
      const parsed = JSON.parse(trimmed);
      const candidate = parsed?.sku ?? parsed?.productSku ?? parsed?.productCid ?? parsed?.ref;
      if (typeof candidate === 'string' && candidate.length) {
        return { key: candidate, label: candidate };
      }
    } catch {
      // not JSON — fall through
    }
    // Use the raw decoded string but cap label length for display.
    const safe = trimmed.replace(/[\x00-\x1f\x7f]/g, '').slice(0, 80);
    if (!safe) return { key: '__unknown__', label: '(unknown)' };
    return { key: safe, label: safe };
  }

  const MAX_BUCKETS = 20;

  const allBuckets = $derived.by<SkuBucket[]>(() => {
    const map = new Map<string, SkuBucket>();
    for (const p of payments) {
      const { key, label } = extractSkuKey(p.dataDecoded);
      const ts = p.timestamp > 0 ? new Date(p.timestamp * 1000) : null;
      if (!ts) continue;
      const price = parseFloat(formatCrcAmount(p.amount));
      if (!isFinite(price) || price <= 0) continue;
      let bucket = map.get(key);
      if (!bucket) {
        bucket = { key, label, series: [] };
        map.set(key, bucket);
      }
      bucket.series.push({ timestamp: ts, price });
    }
    return Array.from(map.values())
      .map((b) => ({ ...b, series: b.series.slice().sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()) }))
      .sort((a, b) => b.series.length - a.series.length);
  });

  const buckets = $derived(allBuckets.slice(0, MAX_BUCKETS));
  const hiddenBucketCount = $derived(Math.max(0, allBuckets.length - MAX_BUCKETS));
</script>

{#if loading}
  <div class="flex items-center gap-2 text-base-content/70 py-2">
    <span class="loading loading-spinner loading-sm"></span>
    <span>Loading price history…</span>
  </div>
{:else if error}
  <div class="alert alert-warning">
    <span>{error}</span>
  </div>
{:else if buckets.length === 0}
  <div class="text-sm opacity-70">No price history</div>
{:else}
  <div class="text-xs opacity-60 mb-2">
    Realised prices from completed sales. Listing price changes that happened without a sale are not shown.
  </div>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    {#each buckets as b (b.key)}
      <div class="bg-base-100 border border-base-300 p-3 rounded-xl shadow-sm">
        <div class="text-xs opacity-70 truncate" title={b.label}>{b.label}</div>
        <div class="text-[10px] opacity-50 mb-1">{b.series.length} sale{b.series.length === 1 ? '' : 's'}</div>
        {#if b.series.length >= 2}
          <ModernHistoryChart
            dataSet1={b.series}
            dataSet2={[]}
            title=""
            label="CRC"
          />
        {:else}
          <div class="text-sm tabular-nums">
            {b.series[0].price.toFixed(2)} CRC · {b.series[0].timestamp.toLocaleDateString()}
          </div>
        {/if}
      </div>
    {/each}
  </div>
  {#if hiddenBucketCount > 0}
    <div class="text-xs opacity-60 mt-3 text-center">
      +{hiddenBucketCount} more SKU{hiddenBucketCount === 1 ? '' : 's'} with fewer sales not shown
    </div>
  {/if}
{/if}
