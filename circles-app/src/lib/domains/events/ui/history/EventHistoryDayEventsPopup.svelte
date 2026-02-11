<script lang="ts">
  import { tick } from 'svelte';
  import { writable } from 'svelte/store';
  import GenericList from '$lib/shared/ui/lists/GenericList.svelte';
  import { createPaginatedList } from '$lib/shared/state/paginatedList';
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

<div class="space-y-3">
  <div class="text-sm opacity-80">
    {dayLabel} · {events.length} event{events.length === 1 ? '' : 's'}
  </div>
  <div class="text-xs opacity-60">Range: {rangeLabel}</div>

  {#if DayPopupHeader}
    <div class="rounded-lg border border-base-300 p-2">
      <DayPopupHeader {dayStartSec} {dayEndSec} {events} />
    </div>
  {/if}

  {#if events.length > 0}
    <div class="rounded-lg border border-base-300 p-2">
      <div class="flex items-center justify-between mb-2 gap-2">
        <div class="text-xs opacity-60">
          {labels.histogramTitle ?? `Events by ${histogramGranularity === 'hour' ? 'hour' : 'minute'}`}
        </div>
        <div class="join">
          <button
            type="button"
            class="btn btn-xs join-item"
            class:btn-primary={histogramGranularity === 'hour'}
            class:btn-ghost={histogramGranularity !== 'hour'}
            onclick={() => (histogramGranularity = 'hour')}
          >
            Hourly
          </button>
          <button
            type="button"
            class="btn btn-xs join-item"
            class:btn-primary={histogramGranularity === 'minute'}
            class:btn-ghost={histogramGranularity !== 'minute'}
            onclick={() => (histogramGranularity = 'minute')}
          >
            Minutely
          </button>
        </div>
      </div>
      <div class="overflow-x-auto" bind:this={histogramScrollEl}>
        <div class={histogramGranularity === 'minute' ? 'min-w-[5760px]' : ''}>
          <div class="h-20 flex items-end gap-[2px]">
            {#each histogramBuckets as count, index (`h-${index}`)}
              <button
                type="button"
                class={`bg-primary/70 rounded-t-sm min-h-[2px] ${histogramGranularity === 'hour' ? 'flex-1' : 'w-[2px] shrink-0'}`}
                style={`height: ${Math.max(2, Math.round((count / maxHistogramCount) * 100))}%`}
                title={`${bucketLabel(index)} · ${count} event${count === 1 ? '' : 's'}`}
                aria-label={`${bucketLabel(index)}: ${count} events`}
                onclick={() => histogramGranularity === 'hour' && drillDownToMinute(index)}
              ></button>
            {/each}
          </div>

          {#if histogramGranularity === 'minute'}
            <div class="mt-1 flex text-[10px] opacity-60 min-w-[5760px]">
              {#each Array.from({ length: 24 }) as _, hour (`hour-label-${hour}`)}
                <div class="w-[240px] shrink-0 text-left">
                  {hour.toString().padStart(2, '0')}:00
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <div class="flex justify-between text-[10px] opacity-60 mt-1" class:hidden={histogramGranularity === 'minute'}>
        {#if histogramGranularity === 'hour'}
          <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
        {/if}
      </div>
    </div>
  {/if}

  <div>
    <input
      type="text"
      class="input input-bordered w-full"
      placeholder={labels.searchPlaceholder ?? 'Search by transaction hash or event type'}
      bind:value={searchQuery}
    />
  </div>

  {#if events.length === 0}
    <div class="text-sm opacity-70">{labels.dayEmpty ?? 'No events in this day.'}</div>
  {:else if filteredEvents.length === 0}
    <div class="text-sm opacity-70">{labels.dayNoMatches ?? 'No matches.'}</div>
  {:else}
    <div class="overflow-auto rounded-lg border border-base-300 max-h-[calc(80vh-14rem)]">
      <div class="px-2">
        <GenericList
          store={listStoreAny}
          row={rowComponentAny}
          getKey={getKeyAny}
          rowHeight={64}
          maxPlaceholderPages={2}
          expectedPageSize={25}
        />
      </div>
    </div>
  {/if}
</div>
