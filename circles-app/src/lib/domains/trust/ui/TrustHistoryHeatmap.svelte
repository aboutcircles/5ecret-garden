<script lang="ts">
  import { circles } from '$lib/shared/state/circles';
  import { get } from 'svelte/store';
  import { CirclesQuery, type PagedQueryParams } from '@circles-sdk/data';
  import type { Address } from '@circles-sdk/utils';
  import TrustHistoryDayCalendar from '$lib/domains/trust/ui/history/TrustHistoryDayCalendar.svelte';
  import TrustHistoryWeeklySections from '$lib/domains/trust/ui/history/TrustHistoryWeeklySections.svelte';
  import TrustHistoryMonthlyList from '$lib/domains/trust/ui/history/TrustHistoryMonthlyList.svelte';
  import TrustHistoryDayEventsPopup from '$lib/domains/trust/ui/history/TrustHistoryDayEventsPopup.svelte';
  import { trustHistoryKnownRangeEvents } from '$lib/domains/trust/ui/history/knownRangeEvents';
  import { popupControls } from '$lib/shared/state/popup';
  import type {
    Granularity,
    CalendarCell,
    MonthCalendar,
    WeeklyBucket,
    MonthWeeklySection,
    MonthlyItem,
    TrustHistoryEventRow,
    TrustHistoryRangeEvent,
  } from '$lib/domains/trust/ui/history/types';

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
  let selectedKnownEventIds: string[] = $state([]);
  let initializedKnownEventSelection = $state(false);
  let knownEventsQuery = $state('');

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
  const knownRangeEvents = $derived(buildKnownRangeEvents());
  const filteredKnownRangeEvents = $derived.by(() => {
    const needle = knownEventsQuery.trim().toLowerCase();
    if (!needle) return knownRangeEvents;
    return knownRangeEvents.filter((event) => {
      const haystack = [event.title, event.description ?? ''].join(' ').toLowerCase();
      return haystack.includes(needle);
    });
  });
  const selectedKnownRangeEvents = $derived(
    knownRangeEvents.filter((event) => selectedKnownEventIds.includes(event.id))
  );
  const establishedCount = $derived(rows.filter((row) => toNumber(row.expiryTime) > toNumber(row.timestamp)).length);
  const removedCount = $derived(rows.length - establishedCount);

  $effect(() => {
    eventCount = rows.length;
  });

  $effect(() => {
    const knownIds = knownRangeEvents.map((event) => event.id);

    if (!initializedKnownEventSelection && knownIds.length > 0) {
      selectedKnownEventIds = knownIds;
      initializedKnownEventSelection = true;
      return;
    }

    const filtered = selectedKnownEventIds.filter((id) => knownIds.includes(id));
    if (filtered.length !== selectedKnownEventIds.length) {
      selectedKnownEventIds = filtered;
    }
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

  function parseDateToDayStartSec(dateString: string): number | null {
    const d = new Date(`${dateString}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return null;
    return Math.floor(d.getTime() / 1000);
  }

  function buildKnownRangeEvents(): TrustHistoryRangeEvent[] {
    return trustHistoryKnownRangeEvents.events
      .map((event) => {
        const startDaySec = parseDateToDayStartSec(event.startDate);
        const endDaySec = parseDateToDayStartSec(event.endDate);
        if (startDaySec === null || endDaySec === null) return null;

        const eventTypeLabel = event.eventType
          ? trustHistoryKnownRangeEvents.taxonomies?.eventType?.[event.eventType]?.label
          : undefined;
        const seriesLabel = event.seriesId
          ? trustHistoryKnownRangeEvents.taxonomies?.series?.[event.seriesId]?.label
          : undefined;

        const locationParts = [event.location?.city ?? null, event.location?.country ?? null].filter(
          (v): v is string => Boolean(v)
        );
        const locationLabel =
          locationParts.length > 0
            ? locationParts.join(', ')
            : event.location?.mode === 'online'
              ? 'Online'
              : event.location?.mode === 'hybrid'
                ? 'Hybrid'
                : undefined;

        const descriptionParts = [seriesLabel, eventTypeLabel, locationLabel].filter(
          (v): v is string => Boolean(v)
        );

        const normalizedStart = Math.min(startDaySec, endDaySec);
        const normalizedEnd = Math.max(startDaySec, endDaySec);

        return {
          id: event.id,
          title: event.title ?? event.name ?? event.id,
          description: event.description ?? (descriptionParts.length > 0 ? descriptionParts.join(' · ') : undefined),
          startDaySec: normalizedStart,
          endDaySec: normalizedEnd,
        } satisfies TrustHistoryRangeEvent;
      })
      .filter((event): event is TrustHistoryRangeEvent => event !== null)
      .sort((a, b) => a.startDaySec - b.startDaySec || a.endDaySec - b.endDaySec || a.title.localeCompare(b.title));
  }

  function toggleKnownEventSelection(eventId: string, enabled: boolean): void {
    if (enabled) {
      if (selectedKnownEventIds.includes(eventId)) return;
      selectedKnownEventIds = [...selectedKnownEventIds, eventId];
      return;
    }

    selectedKnownEventIds = selectedKnownEventIds.filter((id) => id !== eventId);
  }

  function formatKnownEventRange(event: TrustHistoryRangeEvent): string {
    return `${new Date(event.startDaySec * 1000).toLocaleDateString()} – ${new Date(event.endDaySec * 1000).toLocaleDateString()}`;
  }

  function setKnownEventsSelectionAll(enabled: boolean): void {
    if (enabled) {
      selectedKnownEventIds = [...knownRangeEvents.map((event) => event.id)];
      return;
    }
    selectedKnownEventIds = [];
  }

  function setKnownEventsSelectionFiltered(enabled: boolean): void {
    const filteredIds = filteredKnownRangeEvents.map((event) => event.id);
    if (enabled) {
      selectedKnownEventIds = Array.from(new Set([...selectedKnownEventIds, ...filteredIds]));
      return;
    }
    selectedKnownEventIds = selectedKnownEventIds.filter((id) => !filteredIds.includes(id));
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
  <div class="flex items-start justify-between gap-2">
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

    {#if knownRangeEvents.length > 0}
      <details class="dropdown dropdown-end">
        <summary class="btn btn-xs">
          Known events ({selectedKnownRangeEvents.length}/{knownRangeEvents.length})
        </summary>
        <div class="dropdown-content z-[20] mt-2 w-80 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
          <div class="space-y-2">
            <input
              type="text"
              class="input input-xs input-bordered w-full"
              placeholder="Filter events by name, series, type, location"
              bind:value={knownEventsQuery}
            />

            <div class="flex flex-wrap items-center gap-1">
              <button type="button" class="btn btn-xs btn-ghost" onclick={() => setKnownEventsSelectionAll(true)}>
                All
              </button>
              <button type="button" class="btn btn-xs btn-ghost" onclick={() => setKnownEventsSelectionAll(false)}>
                None
              </button>
              <button
                type="button"
                class="btn btn-xs btn-ghost"
                onclick={() => setKnownEventsSelectionFiltered(true)}
              >
                Select filtered
              </button>
              <button
                type="button"
                class="btn btn-xs btn-ghost"
                onclick={() => setKnownEventsSelectionFiltered(false)}
              >
                Clear filtered
              </button>
            </div>
          </div>

          <div class="max-h-72 overflow-auto space-y-1 mt-2 pr-1">
            {#if filteredKnownRangeEvents.length === 0}
              <div class="text-xs opacity-60 p-2">No matching events.</div>
            {/if}

            {#each filteredKnownRangeEvents as event (event.id)}
              <label class="flex items-start gap-2 rounded-md p-2 hover:bg-base-200/40 cursor-pointer">
                <input
                  type="checkbox"
                  class="checkbox checkbox-xs mt-0.5"
                  checked={selectedKnownEventIds.includes(event.id)}
                  onchange={(e) => toggleKnownEventSelection(event.id, (e.currentTarget as HTMLInputElement).checked)}
                />
                <span class="min-w-0 text-xs">
                  <span class="font-medium block">{event.title}</span>
                  <span class="opacity-70 block">{formatKnownEventRange(event)}</span>
                  {#if event.description}
                    <span class="opacity-60 block">{event.description}</span>
                  {/if}
                </span>
              </label>
            {/each}
          </div>
        </div>
      </details>
    {/if}
  </div>

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
        rangeEvents={selectedKnownRangeEvents}
        {selectedDayTsSec}
        onSelectDay={onSelectDay}
      />
    {:else if granularity === 'week'}
      <TrustHistoryWeeklySections
        {weeklySections}
        {maxBucketCount}
        rangeEvents={selectedKnownRangeEvents}
        {selectedWeekStartSec}
        onSelectWeek={onSelectWeek}
      />
    {:else}
      <TrustHistoryMonthlyList
        {monthlyItems}
        {maxBucketCount}
        rangeEvents={selectedKnownRangeEvents}
        onSelectMonth={onSelectMonth}
      />
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
