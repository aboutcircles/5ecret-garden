<script lang="ts">
  import { circles } from '$lib/stores/circles';
  import { get } from 'svelte/store';
  import { CirclesQuery, type PagedQueryParams } from '@circles-sdk/data';
  import type { Address } from '@circles-sdk/utils';

  type Granularity = 'day' | 'week' | 'month';

  interface Props {
    address?: Address;
    granularity?: Granularity;
    showGranularitySwitch?: boolean;
    eventCount?: number;
  }

  let {
    address,
    granularity = 'week',
    showGranularitySwitch = true,
    eventCount = $bindable(0),
  }: Props = $props();

  interface TrustHistoryRow {
    blockNumber: number;
    transactionIndex: number;
    logIndex: number;
    timestamp: number;
    transactionHash?: string;
    version?: number;
    truster: Address;
    trustee: Address;
    expiryTime: number;
    limit?: number;
  }

  type Bucket = {
    startSec: number;
    endSec: number;
    count: number;
  };

  let loading = $state(false);
  let error = $state<string | null>(null);
  let rows = $state<TrustHistoryRow[]>([]);
  let requestId = 0;

  const buckets = $derived(buildBuckets(rows, granularity));
  const maxBucketCount = $derived(Math.max(0, ...buckets.map((b) => b.count)));
  const establishedCount = $derived(rows.filter((row) => toNumber(row.expiryTime) > toNumber(row.timestamp)).length);
  const removedCount = $derived(rows.length - establishedCount);

  $effect(() => {
    eventCount = rows.length;
  });

  $effect(() => {
    if (!address) {
      rows = [];
      error = null;
      loading = false;
      return;
    }

    void loadTrustHistory(address);
  });

  async function loadTrustHistory(trusterAddress: Address): Promise<void> {
    const localRequestId = ++requestId;
    loading = true;
    error = null;

    try {
      const sdk = get(circles);
      if (!sdk?.circlesRpc) {
        throw new Error('Circles SDK not initialized');
      }

      // CrcV2_Trust events are queried from namespace/table CrcV2/Trust.
      const queryDefinition: PagedQueryParams = {
        namespace: 'CrcV2',
        table: 'Trust',
        // Empty means "all schema columns" and avoids brittle column mismatches
        // across indexer/RPC versions.
        columns: [],
        filter: [
          {
            Type: 'FilterPredicate',
            FilterType: 'Equals',
            Column: 'truster',
            Value: trusterAddress.toLowerCase(),
          },
        ],
        sortOrder: 'ASC',
        limit: 1000,
      };

      const query = new CirclesQuery<TrustHistoryRow>(sdk.circlesRpc, queryDefinition);
      const allRows: TrustHistoryRow[] = [];

      // Roll down all pages so the full trust history is represented.
      while (await query.queryNextPage()) {
        const pageRows = query.currentPage?.results ?? [];
        if (pageRows.length === 0) break;
        allRows.push(...pageRows);
      }

      if (localRequestId !== requestId) return;

      rows = allRows
        .slice()
        .sort((a, b) => toNumber(a.timestamp) - toNumber(b.timestamp));
    } catch (e: any) {
      if (localRequestId !== requestId) return;
      rows = [];
      error = e?.message ?? 'Failed to load trust history';
    } finally {
      if (localRequestId === requestId) {
        loading = false;
      }
    }
  }

  function toNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'string') return Number(value);
    return 0;
  }

  function bucketStepSeconds(g: Granularity): number {
    if (g === 'day') return 24 * 60 * 60;
    if (g === 'week') return 7 * 24 * 60 * 60;
    // month is variable; only used in labels/fallback.
    return 30 * 24 * 60 * 60;
  }

  function startOfBucketSec(tsSec: number, g: Granularity): number {
    const d = new Date(tsSec * 1000);

    if (g === 'month') {
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(1);
      return Math.floor(d.getTime() / 1000);
    }

    d.setUTCHours(0, 0, 0, 0);

    if (g === 'week') {
      // Monday-based week.
      const weekday = (d.getUTCDay() + 6) % 7;
      d.setUTCDate(d.getUTCDate() - weekday);
    }

    return Math.floor(d.getTime() / 1000);
  }

  function nextBucketStartSec(startSec: number, g: Granularity): number {
    if (g !== 'month') return startSec + bucketStepSeconds(g);

    const d = new Date(startSec * 1000);
    d.setUTCMonth(d.getUTCMonth() + 1);
    return Math.floor(d.getTime() / 1000);
  }

  function buildBuckets(input: TrustHistoryRow[], g: Granularity): Bucket[] {
    if (input.length === 0) return [];

    const counts = new Map<number, number>();

    for (const row of input) {
      const start = startOfBucketSec(toNumber(row.timestamp), g);
      counts.set(start, (counts.get(start) ?? 0) + 1);
    }

    const starts = Array.from(counts.keys()).sort((a, b) => a - b);
    const minStart = starts[0];
    const maxStart = starts[starts.length - 1];

    const out: Bucket[] = [];
    for (let cursor = minStart; cursor <= maxStart; cursor = nextBucketStartSec(cursor, g)) {
      const next = nextBucketStartSec(cursor, g);
      out.push({
        startSec: cursor,
        endSec: next,
        count: counts.get(cursor) ?? 0,
      });
    }
    return out;
  }

  function bucketLabel(bucket: Bucket): string {
    const start = new Date(bucket.startSec * 1000);
    const endInclusive = new Date((bucket.endSec - 1) * 1000);

    if (granularity === 'month') {
      return `${start.toLocaleString(undefined, { month: 'short', year: 'numeric' })}`;
    }

    if (granularity === 'day') {
      return start.toLocaleDateString();
    }

    return `${start.toLocaleDateString()} – ${endInclusive.toLocaleDateString()}`;
  }

  function intensityClass(count: number, max: number): string {
    if (count <= 0 || max <= 0) return 'bg-base-300/50';

    const ratio = count / max;
    if (ratio <= 0.2) return 'bg-primary/25';
    if (ratio <= 0.4) return 'bg-primary/40';
    if (ratio <= 0.6) return 'bg-primary/55';
    if (ratio <= 0.8) return 'bg-primary/70';
    return 'bg-primary';
  }
</script>

<div class="space-y-3">
  {#if showGranularitySwitch}
    <div class="join">
      <button
        class="btn btn-xs join-item"
        class:btn-primary={granularity === 'day'}
        class:btn-ghost={granularity !== 'day'}
        onclick={() => (granularity = 'day')}
      >
        Day
      </button>
      <button
        class="btn btn-xs join-item"
        class:btn-primary={granularity === 'week'}
        class:btn-ghost={granularity !== 'week'}
        onclick={() => (granularity = 'week')}
      >
        Week
      </button>
      <button
        class="btn btn-xs join-item"
        class:btn-primary={granularity === 'month'}
        class:btn-ghost={granularity !== 'month'}
        onclick={() => (granularity = 'month')}
      >
        Month
      </button>
    </div>
  {/if}

  {#if loading}
    <div class="flex items-center gap-2 text-base-content/70 py-2">
      <span class="loading loading-spinner loading-sm"></span>
      <span>Loading outgoing trust history…</span>
    </div>
  {:else if error}
    <div class="alert alert-warning py-2">
      <span class="text-sm">{error}</span>
    </div>
  {:else if rows.length === 0}
    <div class="text-sm opacity-70">No outgoing trust events found.</div>
  {:else}
    <div class="text-xs opacity-70">
      {rows.length} outgoing trust events · {establishedCount} set · {removedCount} removed
    </div>

    <div class="overflow-x-auto pb-1">
      <div class="inline-flex items-end gap-1 min-w-max">
        {#each buckets as bucket (bucket.startSec)}
          <div
            class={`w-3 h-10 rounded-sm ${intensityClass(bucket.count, maxBucketCount)}`}
            title={`${bucketLabel(bucket)}: ${bucket.count} event${bucket.count === 1 ? '' : 's'}`}
            aria-label={`${bucketLabel(bucket)}: ${bucket.count} events`}
          ></div>
        {/each}
      </div>
    </div>

    <div class="flex items-center gap-2 text-[11px] opacity-70">
      <span>Less</span>
      <div class="w-3 h-3 rounded-sm bg-base-300/50"></div>
      <div class="w-3 h-3 rounded-sm bg-primary/25"></div>
      <div class="w-3 h-3 rounded-sm bg-primary/55"></div>
      <div class="w-3 h-3 rounded-sm bg-primary/80"></div>
      <div class="w-3 h-3 rounded-sm bg-primary"></div>
      <span>More</span>
    </div>
  {/if}
</div>
