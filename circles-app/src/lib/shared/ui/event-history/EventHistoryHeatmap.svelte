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
  import { T } from '$lib/design-system/tokens.js';

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

  $effect(() => { eventCount = rows.length; });

  $effect(() => {
    const knownIds = knownRangeEvents.map((event) => event.id);
    if (!initializedOverlaySelection && knownIds.length > 0) {
      selectedOverlayIds = knownIds;
      initializedOverlaySelection = true;
      return;
    }
    const filtered = selectedOverlayIds.filter((id) => knownIds.includes(id));
    if (filtered.length !== selectedOverlayIds.length) selectedOverlayIds = filtered;
  });

  $effect(() => { void loadEvents(dataSource); });

  async function loadEvents(source: EventHistoryDataSource): Promise<void> {
    const localRequestId = ++requestId;
    loading = true;
    error = null;

    try {
      const sdk = get(circles);
      if (!sdk?.circlesRpc) throw new Error('Circles SDK not initialized');

      const queryDefinition: PagedQueryParams = {
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
      rows = allRows.slice().sort((a, b) => timestampFor(a, source) - timestampFor(b, source));
    } catch (e: any) {
      if (localRequestId !== requestId) return;
      rows = [];
      error = e?.message ?? 'Failed to load event history';
    } finally {
      if (localRequestId === requestId) loading = false;
    }
  }

  function sortRangeEvents(a: RangeOverlayEvent, b: RangeOverlayEvent): number {
    return a.startDaySec - b.startDaySec || a.endDaySec - b.endDaySec || a.title.localeCompare(b.title);
  }

  function timestampFor(row: CirclesBaseEventRow, source: EventHistoryDataSource): number {
    if (source.getTimestampSec) return toNumber(source.getTimestampSec(row));
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
    if (g === 'month') { d.setUTCHours(0,0,0,0); d.setUTCDate(1); return Math.floor(d.getTime() / 1000); }
    d.setUTCHours(0,0,0,0);
    if (g === 'week') { const weekday = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - weekday); }
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
    const d = new Date(tsSec * 1000); d.setUTCHours(0,0,0,0); d.setUTCDate(1);
    return Math.floor(d.getTime() / 1000);
  }

  function startOfWeekSec(tsSec: number): number {
    const d = new Date(tsSec * 1000); d.setUTCHours(0,0,0,0);
    const weekday = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - weekday);
    return Math.floor(d.getTime() / 1000);
  }

  function nextMonthStartSec(tsSec: number): number {
    const d = new Date(tsSec * 1000); d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(1); d.setUTCHours(0,0,0,0);
    return Math.floor(d.getTime() / 1000);
  }

  function getCellCount(tsSec: number, counts: Map<number, number>): number {
    return counts.get(startOfBucketSec(tsSec, 'day')) ?? 0;
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
        for (let i = 0; i < 7; i++) {
          const current = cursor + i * 24 * 60 * 60;
          const currentDate = new Date(current * 1000);
          const inCurrentMonth = currentDate.getUTCMonth() === monthDate.getUTCMonth();
          week.push({ tsSec: current, dayOfMonth: currentDate.getUTCDate(), inCurrentMonth, count: inCurrentMonth ? getCellCount(current, counts) : 0 });
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
      out.push({ startSec: month, label: d.toLocaleString(undefined, { month: 'long', year: 'numeric' }), count: counts.get(month) ?? 0 });
    }
    return out;
  }

  function toggleKnownEventSelection(eventId: string, enabled: boolean): void {
    if (enabled) { if (!selectedOverlayIds.includes(eventId)) selectedOverlayIds = [...selectedOverlayIds, eventId]; return; }
    selectedOverlayIds = selectedOverlayIds.filter((id) => id !== eventId);
  }

  function formatKnownEventRange(event: RangeOverlayEvent): string {
    return `${new Date(event.startDaySec * 1000).toLocaleDateString()} – ${new Date(event.endDaySec * 1000).toLocaleDateString()}`;
  }

  function setKnownEventsSelectionAll(enabled: boolean): void {
    selectedOverlayIds = enabled ? [...knownRangeEvents.map((event) => event.id)] : [];
  }

  function setKnownEventsSelectionFiltered(enabled: boolean): void {
    const filteredIds = filteredKnownRangeEvents.map((event) => event.id);
    if (enabled) selectedOverlayIds = Array.from(new Set([...selectedOverlayIds, ...filteredIds]));
    else selectedOverlayIds = selectedOverlayIds.filter((id) => !filteredIds.includes(id));
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
      props: { dayStartSec, dayEndSec, events, labels, searchHaystack, getTimestampSec: dataSource.getTimestampSec, rowComponent, dayPopupHeaderComponent },
    });
  }

  const summaryText = $derived(labels.summary?.(rows as any) ?? `${rows.length} event${rows.length === 1 ? '' : 's'}`);

  const pillBase = `height:28px;padding:0 12px;border-radius:9999px;border:1px solid ${T.hairline};font-size:11.5px;cursor:pointer;`;
</script>

<div style="display:flex;flex-direction:column;gap:12px;">
  <!-- Controls row -->
  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
    {#if showGranularitySwitch}
      <div style="display:flex;gap:4px;background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};border-radius:9999px;padding:3px;">
        {#each ['day', 'week', 'month'] as g}
          <button
            style="height:26px;padding:0 12px;border-radius:9999px;border:0;font-size:11.5px;font-weight:{granularity === g ? 580 : 400};background:{granularity === g ? T.surface : 'transparent'};color:{granularity === g ? T.ink : T.inkMuted};cursor:pointer;box-shadow:{granularity === g ? T.shadow.xs : 'none'};transition:all 0.1s;"
            onclick={() => (granularity = g as Granularity)}
          >{g.charAt(0).toUpperCase() + g.slice(1)}</button>
        {/each}
      </div>
    {/if}

    {#if knownRangeEvents.length > 0}
      <details style="position:relative;">
        <summary style="{pillBase}background:{T.surface};color:{T.ink};display:inline-flex;align-items:center;gap:6px;list-style:none;cursor:pointer;">
          {overlayLabel} ({selectedKnownRangeEvents.length}/{knownRangeEvents.length})
        </summary>
        <div style="
          position:absolute;right:0;top:calc(100% + 6px);
          z-index:20;width:300px;
          background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;
          box-shadow:{T.shadow.xs};padding:10px;
          display:flex;flex-direction:column;gap:8px;
        ">
          <input
            type="text"
            style="width:100%;padding:8px 10px;border:1px solid {T.hairline};border-radius:8px;font-family:{T.fontSans};font-size:12px;color:{T.ink};background:{T.surface};box-sizing:border-box;"
            placeholder={overlaySearchPlaceholder}
            bind:value={overlayQuery}
          />

          <div style="display:flex;flex-wrap:wrap;gap:4px;">
            {#each [['All', true, true], ['None', false, true], ['Select filtered', true, false], ['Clear filtered', false, false]] as [label, enabled, isAll]}
              <button
                type="button"
                style="{pillBase}background:{T.surfaceAlt};color:{T.inkMuted};"
                onclick={() => isAll ? setKnownEventsSelectionAll(Boolean(enabled)) : setKnownEventsSelectionFiltered(Boolean(enabled))}
              >{label}</button>
            {/each}
          </div>

          <div style="max-height:260px;overflow:auto;display:flex;flex-direction:column;gap:2px;">
            {#if filteredKnownRangeEvents.length === 0}
              <div style="font-size:11.5px;color:{T.inkMuted};padding:8px;">No matching events.</div>
            {/if}

            {#each filteredKnownRangeEvents as event (event.id)}
              <label style="display:flex;align-items:flex-start;gap:8px;padding:6px 4px;border-radius:8px;cursor:pointer;">
                <input
                  type="checkbox"
                  style="accent-color:{T.primary};width:13px;height:13px;margin-top:2px;cursor:pointer;flex-shrink:0;"
                  checked={selectedOverlayIds.includes(event.id)}
                  onchange={(e) =>
                    toggleKnownEventSelection(
                      event.id,
                      e.currentTarget instanceof HTMLInputElement ? e.currentTarget.checked : false
                    )}
                />
                <span style="min-width:0;display:flex;flex-direction:column;gap:2px;">
                  <span style="font-size:12px;font-weight:540;color:{T.ink};">{event.title}</span>
                  <span style="font-size:11px;color:{T.inkMuted};">{formatKnownEventRange(event)}</span>
                  {#if event.description}
                    <span style="font-size:11px;color:{T.inkSubtle};">{event.description}</span>
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
    <div style="display:flex;align-items:center;gap:8px;color:{T.inkMuted};padding:8px 0;">
      <svg class="eventheatmap-spin" style="width:16px;height:16px;color:{T.primary};" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-dasharray="28.3" stroke-dashoffset="9"/></svg>
      <span style="font-size:12.5px;">{labels.loading ?? 'Loading event history…'}</span>
    </div>
  {:else if error}
    <div style="background:{T.warningSoft};border:1px solid rgba(176,112,20,0.2);border-radius:10px;padding:8px 12px;font-size:12.5px;color:{T.inkBody};">
      {error}
    </div>
  {:else if rows.length === 0}
    <div style="font-size:12.5px;color:{T.inkMuted};">{labels.empty ?? 'No events found.'}</div>
  {:else}
    <div style="font-size:11.5px;color:{T.inkMuted};">{summaryText}</div>

    {#if granularity === 'day'}
      <EventHistoryDayCalendar {monthCalendars} {maxBucketCount} rangeEvents={selectedKnownRangeEvents} {selectedDayTsSec} onSelectDay={onSelectDay} />
    {:else if granularity === 'week'}
      <EventHistoryWeeklySections {weeklySections} {maxBucketCount} rangeEvents={selectedKnownRangeEvents} {selectedWeekStartSec} onSelectWeek={onSelectWeek} />
    {:else}
      <EventHistoryMonthlyList {monthlyItems} {maxBucketCount} rangeEvents={selectedKnownRangeEvents} onSelectMonth={onSelectMonth} />
    {/if}

    <!-- Legend -->
    <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:{T.inkMuted};">
      <span>Less</span>
      <div style="width:12px;height:12px;border-radius:4px;background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};"></div>
      <div style="width:12px;height:12px;border-radius:4px;background:rgba(88,73,212,0.15);"></div>
      <div style="width:12px;height:12px;border-radius:4px;background:rgba(88,73,212,0.4);"></div>
      <div style="width:12px;height:12px;border-radius:4px;background:rgba(88,73,212,0.7);"></div>
      <div style="width:12px;height:12px;border-radius:4px;background:{T.primary};"></div>
      <span>More</span>
    </div>
  {/if}
</div>

<style>
  summary::-webkit-details-marker { display: none; }
  @keyframes eventheatmap-spin { from {} to { transform: rotate(360deg); } }
  .eventheatmap-spin { animation: eventheatmap-spin 0.8s linear infinite; }
</style>
