<script lang="ts">
  import GenericList from '$lib/components/GenericList.svelte';
  import TrustHistoryDayEventRow from '$lib/components/trustHistory/TrustHistoryDayEventRow.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { createPaginatedList } from '$lib/stores/paginatedList';
  import { writable } from 'svelte/store';
  import type { TrustHistoryEventRow } from './types';

  interface Props {
    dayStartSec: number;
    dayEndSec: number;
    events: TrustHistoryEventRow[];
  }

  let { dayStartSec, dayEndSec, events }: Props = $props();
  let searchQuery = $state('');
  const filteredEventsStore = writable<TrustHistoryEventRow[]>([]);
  const paginatedRows = createPaginatedList(filteredEventsStore as any, { pageSize: 25 });

  const dayLabel = $derived(new Date(dayStartSec * 1000).toLocaleDateString());
  const rangeLabel = $derived(
    `${new Date(dayStartSec * 1000).toLocaleTimeString()} - ${new Date(dayEndSec * 1000).toLocaleTimeString()}`
  );
  const originAddress = $derived(events[0]?.truster);
  const hourlyCounts = $derived.by(() => {
    const buckets = Array.from({ length: 24 }, () => 0);
    for (const row of events) {
      const hour = new Date(Number(row.timestamp) * 1000).getHours();
      buckets[hour] += 1;
    }
    return buckets;
  });
  const maxHourlyCount = $derived(Math.max(1, ...hourlyCounts));

  const filteredEvents = $derived.by(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return events;
    return events.filter((row) => {
      const haystack = [
        String(row.trustee ?? ''),
        String(row.transactionHash ?? ''),
        Number(row.expiryTime) > Number(row.timestamp) ? 'trust set' : 'trust removed',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  });

  $effect(() => {
    filteredEventsStore.set(filteredEvents);
  });
</script>

<div class="space-y-3">
  <div class="text-sm opacity-80">
    {dayLabel} · {events.length} event{events.length === 1 ? '' : 's'}
  </div>
  <div class="text-xs opacity-60">Range: {rangeLabel}</div>

  {#if originAddress}
    <div class="rounded-lg border border-base-300 p-2">
      <div class="text-xs opacity-60 mb-1">Trust originated from</div>
      <Avatar address={originAddress} view="horizontal" clickable={true} showTypeInfo={true} />
    </div>
  {/if}

  {#if events.length > 0}
    <div class="rounded-lg border border-base-300 p-2">
      <div class="text-xs opacity-60 mb-2">Events by hour</div>
      <div class="h-20 flex items-end gap-[2px]">
        {#each hourlyCounts as count, hour (`h-${hour}`)}
          <div
            class="flex-1 bg-primary/70 rounded-t-sm min-h-[2px]"
            style={`height: ${Math.max(2, Math.round((count / maxHourlyCount) * 100))}%`}
            title={`${hour.toString().padStart(2, '0')}:00 · ${count} event${count === 1 ? '' : 's'}`}
            aria-label={`${hour.toString().padStart(2, '0')}:00: ${count} events`}
          ></div>
        {/each}
      </div>
      <div class="flex justify-between text-[10px] opacity-60 mt-1">
        <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
      </div>
    </div>
  {/if}

  <div>
    <input
      type="text"
      class="input input-bordered w-full"
      placeholder="Search trustees, tx hash, or event type"
      bind:value={searchQuery}
    />
  </div>

  {#if events.length === 0}
    <div class="text-sm opacity-70">No trust events in this day.</div>
  {:else if filteredEvents.length === 0}
    <div class="text-sm opacity-70">No matches.</div>
  {:else}
    <div class="overflow-auto rounded-lg border border-base-300 max-h-[calc(80vh-14rem)]">
      <div class="px-2">
        <GenericList
          store={paginatedRows as any}
          row={TrustHistoryDayEventRow as any}
          getKey={(row: TrustHistoryEventRow) => `${row.blockNumber}-${row.transactionIndex}-${row.logIndex}`}
          rowHeight={64}
          maxPlaceholderPages={2}
          expectedPageSize={25}
        />
      </div>
    </div>
  {/if}
</div>
