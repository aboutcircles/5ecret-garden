<script lang="ts">
  import { circles } from '$lib/stores/circles';
  import { get } from 'svelte/store';
  import { CirclesQuery, type PagedQueryParams } from '@circles-sdk/data';
  import type { Address } from '@circles-sdk/utils';
  import TrustHistoryDayCalendar from '$lib/components/trustHistory/TrustHistoryDayCalendar.svelte';
  import TrustHistoryWeeklySections from '$lib/components/trustHistory/TrustHistoryWeeklySections.svelte';
  import TrustHistoryMonthlyList from '$lib/components/trustHistory/TrustHistoryMonthlyList.svelte';
  import TrustHistoryDayEventsPopup from '$lib/components/trustHistory/TrustHistoryDayEventsPopup.svelte';
  import { popupControls } from '$lib/stores/popup';
  import type {
    Granularity,
    CalendarCell,
    MonthCalendar,
    WeeklyBucket,
    MonthWeeklySection,
    MonthlyItem,
    TrustHistoryEventRow,
  } from '$lib/components/trustHistory/types';

  interface Props {
    address?: Address;
    granularity?: Granularity;
    showGranularitySwitch?: boolean;
    eventCount?: number;
  }

  let {
    address,
    granularity = 'month',
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

  let loading = $state(false);
  let error = $state<string | null>(null);
  let rows = $state<TrustHistoryRow[]>([]);
  let requestId = 0;
  let selectedWeekStartSec: number | null = $state(null);
  let selectedDayTsSec: number | null = $state(null);

  const dayCounts = $derived(buildCountMap(rows, 'day'));
  const weekCounts = $derived(buildCountMap(rows, 'week'));
  const monthCounts = $derived(buildCountMap(rows, 'month'));
  const maxBucketCount = $derived(
    granularity === 'day'
      ? Math.max(0, ...Array.from(dayCounts.values()))
      : granularity === 'week'
        ? Math.max(0, ...Array.from(weekCounts.values()))
        : Math.max(0, ...Array.from(monthCounts.values()))
  );
  const monthCalendars = $derived(buildMonthCalendars(rows, dayCounts));
  const weeklySections = $derived(buildWeeklySections(rows, weekCounts));
  const monthlyItems = $derived(buildMonthlyItems(rows, monthCounts));
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

  function buildCountMap(input: TrustHistoryRow[], g: Granularity): Map<number, number> {
    const counts = new Map<number, number>();
    for (const row of input) {
      const start = startOfBucketSec(toNumber(row.timestamp), g);
      counts.set(start, (counts.get(start) ?? 0) + 1);
    }
    return counts;
  }

  function startOfMonthSec(tsSec: number): number {
    const d = new Date(tsSec * 1000);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(1);
    return Math.floor(d.getTime() / 1000);
  }

  function startOfWeekSec(tsSec: number): number {
    const d = new Date(tsSec * 1000);
    d.setUTCHours(0, 0, 0, 0);
    const weekday = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - weekday);
    return Math.floor(d.getTime() / 1000);
  }

  function nextMonthStartSec(tsSec: number): number {
    const d = new Date(tsSec * 1000);
    d.setUTCMonth(d.getUTCMonth() + 1);
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);
    return Math.floor(d.getTime() / 1000);
  }

  function getCellCount(tsSec: number, counts: Map<number, number>): number {
    const bucketStart = startOfBucketSec(tsSec, 'day');
    return counts.get(bucketStart) ?? 0;
  }

  function buildMonthCalendars(input: TrustHistoryRow[], counts: Map<number, number>): MonthCalendar[] {
    if (input.length === 0) return [];

    const firstTs = toNumber(input[0].timestamp);
    const lastTs = toNumber(input[input.length - 1].timestamp);
    const firstMonth = startOfMonthSec(firstTs);
    const lastMonth = startOfMonthSec(lastTs);

    const out: MonthCalendar[] = [];

    for (let month = firstMonth; month <= lastMonth; month = nextMonthStartSec(month)) {
      const monthDate = new Date(month * 1000);
      const monthLabel = monthDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });
      const monthEnd = nextMonthStartSec(month) - 1;

      const gridStart = startOfWeekSec(month);
      const gridEnd = startOfWeekSec(monthEnd) + 6 * 24 * 60 * 60;

      const weeks: CalendarCell[][] = [];
      let cursor = gridStart;

      while (cursor <= gridEnd) {
        const week: CalendarCell[] = [];
        for (let i = 0; i < 7; i += 1) {
          const current = cursor + i * 24 * 60 * 60;
          const currentDate = new Date(current * 1000);
          const inCurrentMonth = currentDate.getUTCMonth() === monthDate.getUTCMonth();
          week.push({
            tsSec: current,
            dayOfMonth: currentDate.getUTCDate(),
            inCurrentMonth,
            count: inCurrentMonth ? getCellCount(current, counts) : 0,
          });
        }
        weeks.push(week);
        cursor += 7 * 24 * 60 * 60;
      }

      out.push({
        key: String(month),
        label: monthLabel,
        weeks,
      });
    }

    return out;
  }

  function buildWeeklySections(input: TrustHistoryRow[], counts: Map<number, number>): MonthWeeklySection[] {
    if (input.length === 0) return [];

    const firstTs = toNumber(input[0].timestamp);
    const lastTs = toNumber(input[input.length - 1].timestamp);
    const firstMonth = startOfMonthSec(firstTs);
    const lastMonth = startOfMonthSec(lastTs);
    const out: MonthWeeklySection[] = [];

    for (let month = firstMonth; month <= lastMonth; month = nextMonthStartSec(month)) {
      const monthDate = new Date(month * 1000);
      const monthLabel = monthDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });
      const monthEnd = nextMonthStartSec(month) - 1;
      const firstWeek = startOfWeekSec(month);
      const lastWeek = startOfWeekSec(monthEnd);
      const weeks: WeeklyBucket[] = [];

      for (let w = firstWeek; w <= lastWeek; w += 7 * 24 * 60 * 60) {
        weeks.push({ startSec: w, count: counts.get(w) ?? 0 });
      }

      out.push({ key: String(month), label: monthLabel, weeks });
    }

    return out;
  }

  function buildMonthlyItems(input: TrustHistoryRow[], counts: Map<number, number>): MonthlyItem[] {
    if (input.length === 0) return [];

    const firstTs = toNumber(input[0].timestamp);
    const lastTs = toNumber(input[input.length - 1].timestamp);
    const firstMonth = startOfMonthSec(firstTs);
    const lastMonth = startOfMonthSec(lastTs);
    const out: MonthlyItem[] = [];

    for (let month = firstMonth; month <= lastMonth; month = nextMonthStartSec(month)) {
      const d = new Date(month * 1000);
      out.push({
        startSec: month,
        label: d.toLocaleString(undefined, { month: 'long', year: 'numeric' }),
        count: counts.get(month) ?? 0,
      });
    }

    return out;
  }

  function onSelectMonth(monthStartSec: number): void {
    selectedWeekStartSec = startOfWeekSec(monthStartSec);
    granularity = 'week';
  }

  function onSelectWeek(weekStartSec: number): void {
    selectedDayTsSec = weekStartSec;
    granularity = 'day';
  }

  function onSelectDay(dayStartSec: number): void {
    const dayEndSec = dayStartSec + 24 * 60 * 60;
    const events = rows.filter((row) => {
      const ts = toNumber(row.timestamp);
      return ts >= dayStartSec && ts < dayEndSec;
    }) as TrustHistoryEventRow[];

    popupControls.open({
      title: 'Trust events',
      component: TrustHistoryDayEventsPopup,
      props: {
        dayStartSec,
        dayEndSec,
        events,
      },
    });
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

    {#if granularity === 'day'}
      <TrustHistoryDayCalendar
        {monthCalendars}
        {maxBucketCount}
        {selectedDayTsSec}
        onSelectDay={onSelectDay}
      />
    {:else if granularity === 'week'}
      <TrustHistoryWeeklySections
        {weeklySections}
        {maxBucketCount}
        {selectedWeekStartSec}
        onSelectWeek={onSelectWeek}
      />
    {:else}
      <TrustHistoryMonthlyList {monthlyItems} {maxBucketCount} onSelectMonth={onSelectMonth} />
    {/if}

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
