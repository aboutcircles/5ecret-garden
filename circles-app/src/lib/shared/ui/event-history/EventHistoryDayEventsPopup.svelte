<script lang="ts">
  import { tick } from 'svelte';
  import { writable } from 'svelte/store';
  import { T } from '$lib/design-system/tokens.js';
  import GenericList from '$lib/shared/ui/lists/GenericList.svelte';
  import { createPaginatedList } from '$lib/shared/state/paginatedList';
  import EventHistoryRowPlaceholder from '$lib/shared/ui/lists/placeholders/EventHistoryRowPlaceholder.svelte';
  import type {
    CirclesBaseEventRow,
    EventHistoryDayPopupHeaderComponent,
    EventHistoryLabels,
    EventHistoryListItem,
    EventHistoryRowComponent,
  } from './types';

  interface Props<Row extends CirclesBaseEventRow = CirclesBaseEventRow> {
    dayStartSec: number;
    dayEndSec: number;
    events: Row[];
    labels?: EventHistoryLabels<Row>;
    searchHaystack?: (row: Row) => string;
    getTimestampSec?: (row: Row) => number;
    rowComponent: EventHistoryRowComponent<Row>;
    dayPopupHeaderComponent?: EventHistoryDayPopupHeaderComponent<Row>;
  }

  let {
    dayStartSec,
    dayEndSec,
    events,
    labels = {},
    searchHaystack,
    getTimestampSec,
    rowComponent,
    dayPopupHeaderComponent,
  }: Props = $props();

  const DayPopupHeader = $derived(dayPopupHeaderComponent ?? null);

  let searchQuery = $state('');
  let histogramGranularity = $state<'hour' | 'minute'>('hour');
  let histogramScrollEl: HTMLDivElement | null = $state(null);

  const filteredEventsStore = writable<EventHistoryListItem[]>([]);
  const paginatedRows = createPaginatedList(filteredEventsStore as any, { pageSize: 25 });
  const eventKey = (item: EventHistoryListItem) => item.key;
  const listStoreAny = paginatedRows as any;
  const rowComponentAny = $derived(rowComponent as any);
  const getKeyAny = eventKey as any;

  const dayLabel = $derived(new Date(dayStartSec * 1000).toLocaleDateString());
  const rangeLabel = $derived(
    `${new Date(dayStartSec * 1000).toLocaleTimeString()} - ${new Date(dayEndSec * 1000).toLocaleTimeString()}`
  );

  const histogramBuckets = $derived.by(() => {
    const bucketCount = histogramGranularity === 'hour' ? 24 : 24 * 60;
    const buckets = Array.from({ length: bucketCount }, () => 0);

    for (const row of events) {
      const ts = timestampFor(row);
      const d = new Date(ts * 1000);
      const hour = d.getHours();
      const minute = d.getMinutes();
      const index = histogramGranularity === 'hour' ? hour : hour * 60 + minute;
      buckets[index] += 1;
    }

    return buckets;
  });

  const maxHistogramCount = $derived(Math.max(1, ...histogramBuckets));

  const MINUTE_BAR_WIDTH = 2;
  const BAR_GAP = 2;

  function bucketLabel(index: number): string {
    if (histogramGranularity === 'hour') {
      return `${index.toString().padStart(2, '0')}:00`;
    }
    const hour = Math.floor(index / 60);
    const minute = index % 60;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  function defaultHaystack(row: CirclesBaseEventRow): string {
    return [String(row.transactionHash ?? ''), String(row.$event ?? '')].join(' ').toLowerCase();
  }

  function timestampFor(row: CirclesBaseEventRow): number {
    if (getTimestampSec) {
      const v = getTimestampSec(row);
      return Number.isFinite(v) ? Number(v) : 0;
    }
    return toNumber(row.timestamp);
  }

  function toNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'string') return Number(value);
    return 0;
  }

  const filteredEvents = $derived.by(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return events;
    return events.filter((row) => {
      const haystack = searchHaystack ? searchHaystack(row) : defaultHaystack(row);
      return haystack.toLowerCase().includes(needle);
    });
  });

  const groupedListItems = $derived.by(() => {
    const sorted = filteredEvents
      .slice()
      .sort(
        (a, b) =>
          Number(a.blockNumber) - Number(b.blockNumber) ||
          Number(a.transactionIndex) - Number(b.transactionIndex) ||
          Number(a.logIndex) - Number(b.logIndex)
      );

    const out: EventHistoryListItem[] = [];
    let i = 0;
    while (i < sorted.length) {
      const base = sorted[i];
      const txHash = base.transactionHash ?? '';
      const txIndex = Number(base.transactionIndex);
      const blockNumber = Number(base.blockNumber);
      let j = i;

      while (
        j < sorted.length &&
        Number(sorted[j].blockNumber) === blockNumber &&
        Number(sorted[j].transactionIndex) === txIndex &&
        (sorted[j].transactionHash ?? '') === txHash
      ) {
        j += 1;
      }

      out.push({
        kind: 'group',
        key: `group-${blockNumber}-${txIndex}-${txHash || 'none'}`,
        transactionHash: base.transactionHash,
        blockNumber,
        transactionIndex: txIndex,
        count: j - i,
      });

      for (let k = i; k < j; k += 1) {
        const row = sorted[k];
        out.push({
          kind: 'event',
          key: `event-${row.blockNumber}-${row.transactionIndex}-${row.logIndex}`,
          row,
        });
      }

      i = j;
    }

    return out;
  });

  $effect(() => {
    filteredEventsStore.set(groupedListItems);
  });

  async function drillDownToMinute(hour: number): Promise<void> {
    histogramGranularity = 'minute';
    await tick();
    if (!histogramScrollEl) return;

    const minuteIndex = Math.max(0, Math.min(23, hour)) * 60;
    const targetLeft = minuteIndex * (MINUTE_BAR_WIDTH + BAR_GAP) - histogramScrollEl.clientWidth / 2;
    const maxLeft = Math.max(0, histogramScrollEl.scrollWidth - histogramScrollEl.clientWidth);
    histogramScrollEl.scrollTo({ left: Math.max(0, Math.min(targetLeft, maxLeft)), behavior: 'smooth' });
  }
</script>

<div style="display:flex;flex-direction:column;gap:12px;">
  <div style="font-size:13px;opacity:0.8;">
    {dayLabel} · {events.length} event{events.length === 1 ? '' : 's'}
  </div>
  <div style="font-size:12px;opacity:0.6;">Range: {rangeLabel}</div>

  {#if DayPopupHeader}
    <div style="border-radius:8px;border:1px solid {T.hairlineSoft};padding:8px;">
      <DayPopupHeader {dayStartSec} {dayEndSec} {events} />
    </div>
  {/if}

  {#if events.length > 0}
    <div style="border-radius:8px;border:1px solid {T.hairlineSoft};padding:8px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:8px;">
        <div style="font-size:12px;opacity:0.6;">
          {labels.histogramTitle ?? `Events by ${histogramGranularity === 'hour' ? 'hour' : 'minute'}`}
        </div>
        <div style="display:flex;border-radius:9999px;border:1px solid {T.hairlineSoft};overflow:hidden;">
          <button
            type="button"
            style="padding:2px 10px;font-size:11px;border:0;cursor:pointer;font-family:{T.fontSans};{histogramGranularity === 'hour' ? `background:${T.primary};color:#fff;` : `background:transparent;color:${T.inkMuted};`}"
            onclick={() => (histogramGranularity = 'hour')}
          >
            Hourly
          </button>
          <button
            type="button"
            style="padding:2px 10px;font-size:11px;border:0;cursor:pointer;font-family:{T.fontSans};{histogramGranularity === 'minute' ? `background:${T.primary};color:#fff;` : `background:transparent;color:${T.inkMuted};`}"
            onclick={() => (histogramGranularity = 'minute')}
          >
            Minutely
          </button>
        </div>
      </div>
      <div style="overflow-x:auto;" bind:this={histogramScrollEl}>
        <div style={histogramGranularity === 'minute' ? 'min-width:5760px;' : ''}>
          <div style="height:80px;display:flex;align-items:flex-end;gap:2px;">
            {#each histogramBuckets as count, index (`h-${index}`)}
              <button
                type="button"
                style="background:rgba(88,73,212,0.7);border-radius:2px 2px 0 0;min-height:2px;border:0;padding:0;cursor:pointer;{histogramGranularity === 'hour' ? 'flex:1;' : 'width:2px;flex-shrink:0;'}height:{Math.max(2, Math.round((count / maxHistogramCount) * 100))}%;"
                title={`${bucketLabel(index)} · ${count} event${count === 1 ? '' : 's'}`}
                aria-label={`${bucketLabel(index)}: ${count} events`}
                onclick={() => histogramGranularity === 'hour' && drillDownToMinute(index)}
              ></button>
            {/each}
          </div>

          {#if histogramGranularity === 'minute'}
            <div style="margin-top:4px;display:flex;font-size:10px;opacity:0.6;min-width:5760px;">
              {#each Array.from({ length: 24 }) as _, hour (`hour-label-${hour}`)}
                <div style="width:240px;flex-shrink:0;text-align:left;">
                  {hour.toString().padStart(2, '0')}:00
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <div style="display:{histogramGranularity === 'minute' ? 'none' : 'flex'};justify-content:space-between;font-size:10px;opacity:0.6;margin-top:4px;">
        {#if histogramGranularity === 'hour'}
          <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
        {/if}
      </div>
    </div>
  {/if}

  <div>
    <input
      type="text"
      style="width:100%;height:36px;padding:0 12px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:13px;font-family:{T.fontSans};outline:none;box-sizing:border-box;"
      placeholder={labels.searchPlaceholder ?? 'Search by transaction hash or event type'}
      bind:value={searchQuery}
    />
  </div>

  {#if events.length === 0}
    <div style="font-size:13px;opacity:0.7;">{labels.dayEmpty ?? 'No events in this day.'}</div>
  {:else if filteredEvents.length === 0}
    <div style="font-size:13px;opacity:0.7;">{labels.dayNoMatches ?? 'No matches.'}</div>
  {:else}
    <div style="overflow:auto;border-radius:8px;border:1px solid {T.hairlineSoft};max-height:calc(80vh - 14rem);">
      <div style="padding:0 8px;">
        <GenericList
          store={listStoreAny}
          row={rowComponentAny}
          getKey={getKeyAny}
          rowHeight={64}
          maxPlaceholderPages={2}
          expectedPageSize={25}
          placeholderRow={EventHistoryRowPlaceholder}
        />
      </div>
    </div>
  {/if}
</div>
