<script lang="ts">
  import { circles } from '$lib/shared/state/circles';
  import { get } from 'svelte/store';
  import { CirclesQuery, type PagedQueryParams } from '@circles-sdk/data';
  import { popupControls } from '$lib/shared/state/popup';
  import EventHistoryDayCalendar from './EventHistoryDayCalendar.svelte';
  import EventHistoryWeeklySections from './EventHistoryWeeklySections.svelte';
  import EventHistoryMonthlyList from './EventHistoryMonthlyList.svelte';
  import EventHistoryDayEventsPopup from './EventHistoryDayEventsPopup.svelte';
  import type {
    CalendarCell,
    CirclesBaseEventRow,
    EventHistoryDataSource,
    EventHistoryDayPopupHeaderComponent,
    EventHistoryLabels,
    EventHistoryOverlays,
    EventHistoryRowComponent,
    Granularity,
    MonthlyItem,
    MonthCalendar,
    MonthWeeklySection,
    RangeOverlayEvent,
    WeeklyBucket,
  } from './types';

  interface Props {
    dataSource: EventHistoryDataSource;
    labels?: EventHistoryLabels;
    searchHaystack?: (row: CirclesBaseEventRow) => string;
    rowComponent: EventHistoryRowComponent;
    dayPopupHeaderComponent?: EventHistoryDayPopupHeaderComponent;
    overlays?: EventHistoryOverlays;
    granularity?: Granularity;
    showGranularitySwitch?: boolean;
    eventCount?: number;
  }

  let {
    dataSource,
    labels = {},
    searchHaystack,
    rowComponent,
    dayPopupHeaderComponent,
    overlays,
    granularity = $bindable<Granularity>('month'),
    showGranularitySwitch = true,
    eventCount = $bindable(0),
  }: Props = $props();

  let loading = $state(false);
  let error = $state<string | null>(null);
  let rows = $state<CirclesBaseEventRow[]>([]);
  let requestId = 0;
  let selectedWeekStartSec: number | null = $state(null);
  let selectedDayTsSec: number | null = $state(null);
  let selectedOverlayIds: string[] = $state([]);
  let initializedOverlaySelection = $state(false);
  let overlayQuery = $state('');

  const overlayLabel = $derived(overlays?.overlayLabel ?? 'Known events');
  const overlaySearchPlaceholder = $derived(overlays?.overlaySearchPlaceholder ?? 'Filter overlay events');

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
  const knownRangeEvents = $derived((overlays?.rangeEvents ?? []).slice().sort(sortRangeEvents));
  const filteredKnownRangeEvents = $derived.by(() => {
    const needle = overlayQuery.trim().toLowerCase();
    if (!needle) return knownRangeEvents;
    return knownRangeEvents.filter((event) => {
      const haystack = [event.title, event.description ?? ''].join(' ').toLowerCase();
      return haystack.includes(needle);
    });
  });
  const selectedKnownRangeEvents = $derived(knownRangeEvents.filter((event) => selectedOverlayIds.includes(event.id)));

  $effect(() => {
    eventCount = rows.length;
  });

  $effect(() => {
    const knownIds = knownRangeEvents.map((event) => event.id);

    if (!initializedOverlaySelection && knownIds.length > 0) {
      selectedOverlayIds = knownIds;
      initializedOverlaySelection = true;
      return;
    }

    const filtered = selectedOverlayIds.filter((id) => knownIds.includes(id));
    if (filtered.length !== selectedOverlayIds.length) {
      selectedOverlayIds = filtered;
    }
  });

  $effect(() => {
    void loadEvents(dataSource);
  });

  async function loadEvents(source: EventHistoryDataSource): Promise<void> {
    const localRequestId = ++requestId;
    loading = true;
    error = null;

    try {
      const sdk = get(circles);
      if (!sdk?.circlesRpc) {
        throw new Error('Circles SDK not initialized');
      }

      const queryDefinition: PagedQueryParams = {
        // `PagedQueryParams` types from `@circles-sdk/data` are stricter than our dataSource surface;
        // keep casts localized here (integration boundary).
        namespace: source.namespace as any,
        table: source.table as any,
        columns: source.columns ?? [],
        filter: (source.baseFilter ?? []) as any,
        sortOrder: source.sortOrder ?? 'ASC',
        limit: source.pageSize ?? 1000,
      };

      const query = new CirclesQuery<CirclesBaseEventRow>(sdk.circlesRpc, queryDefinition);
      const allRows: CirclesBaseEventRow[] = [];

      while (await query.queryNextPage()) {
        const pageRows = query.currentPage?.results ?? [];
        if (pageRows.length === 0) break;
        allRows.push(...pageRows);
      }

      if (localRequestId !== requestId) return;

      rows = allRows
        .slice()
        .sort((a, b) => timestampFor(a, source) - timestampFor(b, source));
    } catch (e: any) {
      if (localRequestId !== requestId) return;
      rows = [];
      error = e?.message ?? 'Failed to load event history';
    } finally {
      if (localRequestId === requestId) {
        loading = false;
      }
    }
  }

  function sortRangeEvents(a: RangeOverlayEvent, b: RangeOverlayEvent): number {
    return a.startDaySec - b.startDaySec || a.endDaySec - b.endDaySec || a.title.localeCompare(b.title);
  }

  function timestampFor(row: CirclesBaseEventRow, source: EventHistoryDataSource): number {
    if (source.getTimestampSec) {
      return toNumber(source.getTimestampSec(row));
    }
    return toNumber(row.timestamp);
  }

  function toNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'string') return Number(value);
    return 0;
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
      const weekday = (d.getUTCDay() + 6) % 7;
      d.setUTCDate(d.getUTCDate() - weekday);
    }

    return Math.floor(d.getTime() / 1000);
  }

  function buildCountMap(input: CirclesBaseEventRow[], g: Granularity): Map<number, number> {
    const counts = new Map<number, number>();
    for (const row of input) {
      const start = startOfBucketSec(timestampFor(row, dataSource), g);
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

  function buildMonthCalendars(input: CirclesBaseEventRow[], counts: Map<number, number>): MonthCalendar[] {
    if (input.length === 0) return [];

    const firstTs = timestampFor(input[0], dataSource);
    const lastTs = timestampFor(input[input.length - 1], dataSource);
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

      out.push({ key: String(month), label: monthLabel, weeks });
    }

    return out;
  }

  function buildWeeklySections(input: CirclesBaseEventRow[], counts: Map<number, number>): MonthWeeklySection[] {
    if (input.length === 0) return [];

    const firstTs = timestampFor(input[0], dataSource);
    const lastTs = timestampFor(input[input.length - 1], dataSource);
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

  function buildMonthlyItems(input: CirclesBaseEventRow[], counts: Map<number, number>): MonthlyItem[] {
    if (input.length === 0) return [];

    const firstTs = timestampFor(input[0], dataSource);
    const lastTs = timestampFor(input[input.length - 1], dataSource);
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

  function toggleKnownEventSelection(eventId: string, enabled: boolean): void {
    if (enabled) {
      if (selectedOverlayIds.includes(eventId)) return;
      selectedOverlayIds = [...selectedOverlayIds, eventId];
      return;
    }
    selectedOverlayIds = selectedOverlayIds.filter((id) => id !== eventId);
  }

  function formatKnownEventRange(event: RangeOverlayEvent): string {
    return `${new Date(event.startDaySec * 1000).toLocaleDateString()} – ${new Date(event.endDaySec * 1000).toLocaleDateString()}`;
  }

  function setKnownEventsSelectionAll(enabled: boolean): void {
    if (enabled) {
      selectedOverlayIds = [...knownRangeEvents.map((event) => event.id)];
      return;
    }
    selectedOverlayIds = [];
  }

  function setKnownEventsSelectionFiltered(enabled: boolean): void {
    const filteredIds = filteredKnownRangeEvents.map((event) => event.id);
    if (enabled) {
      selectedOverlayIds = Array.from(new Set([...selectedOverlayIds, ...filteredIds]));
      return;
    }
    selectedOverlayIds = selectedOverlayIds.filter((id) => !filteredIds.includes(id));
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
      const ts = timestampFor(row, dataSource);
      return ts >= dayStartSec && ts < dayEndSec;
    });

    popupControls.open({
      title: labels.dayPopupTitle?.(dayStartSec, events as any) ?? labels.title ?? 'Events',
      component: EventHistoryDayEventsPopup,
      props: {
        dayStartSec,
        dayEndSec,
        events,
        labels,
        searchHaystack,
        getTimestampSec: dataSource.getTimestampSec,
        rowComponent,
        dayPopupHeaderComponent,
      },
    });
  }

  const summaryText = $derived(labels.summary?.(rows as any) ?? `${rows.length} event${rows.length === 1 ? '' : 's'}`);
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
          {overlayLabel} ({selectedKnownRangeEvents.length}/{knownRangeEvents.length})
        </summary>
        <div class="dropdown-content z-[20] mt-2 w-80 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
          <div class="space-y-2">
            <input
              type="text"
              class="input input-xs input-bordered w-full"
              placeholder={overlaySearchPlaceholder}
              bind:value={overlayQuery}
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
                  checked={selectedOverlayIds.includes(event.id)}
                  onchange={(e) =>
                    toggleKnownEventSelection(
                      event.id,
                      e.currentTarget instanceof HTMLInputElement ? e.currentTarget.checked : false
                    )}
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
      <span>{labels.loading ?? 'Loading event history…'}</span>
    </div>
  {:else if error}
    <div class="alert alert-warning py-2">
      <span class="text-sm">{error}</span>
    </div>
  {:else if rows.length === 0}
    <div class="text-sm opacity-70">{labels.empty ?? 'No events found.'}</div>
  {:else}
    <div class="text-xs opacity-70">{summaryText}</div>

    {#if granularity === 'day'}
      <EventHistoryDayCalendar
        {monthCalendars}
        {maxBucketCount}
        rangeEvents={selectedKnownRangeEvents}
        {selectedDayTsSec}
        onSelectDay={onSelectDay}
      />
    {:else if granularity === 'week'}
      <EventHistoryWeeklySections
        {weeklySections}
        {maxBucketCount}
        rangeEvents={selectedKnownRangeEvents}
        {selectedWeekStartSec}
        onSelectWeek={onSelectWeek}
      />
    {:else}
      <EventHistoryMonthlyList
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
