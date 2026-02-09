<script lang="ts">
  import type { MonthlyItem, RangeOverlayEvent } from './types';

  interface Props {
    monthlyItems: MonthlyItem[];
    maxBucketCount: number;
    rangeEvents?: RangeOverlayEvent[];
    onSelectMonth?: (monthStartSec: number) => void;
  }

  let { monthlyItems, maxBucketCount, rangeEvents = [], onSelectMonth }: Props = $props();

  function intensityClass(count: number, max: number): string {
    if (count <= 0 || max <= 0) return 'bg-base-300/50';
    const ratio = count / max;
    if (ratio <= 0.2) return 'bg-primary/25';
    if (ratio <= 0.4) return 'bg-primary/40';
    if (ratio <= 0.6) return 'bg-primary/55';
    if (ratio <= 0.8) return 'bg-primary/70';
    return 'bg-primary';
  }

  function nextMonthStartSec(monthStartSec: number): number {
    const d = new Date(monthStartSec * 1000);
    d.setUTCMonth(d.getUTCMonth() + 1);
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);
    return Math.floor(d.getTime() / 1000);
  }

  function monthRangeEvents(monthStartSec: number): RangeOverlayEvent[] {
    const monthEndSec = nextMonthStartSec(monthStartSec) - 1;
    return rangeEvents.filter((event) => event.startDaySec <= monthEndSec && event.endDaySec >= monthStartSec);
  }

  function isMonthRangeStart(event: RangeOverlayEvent, monthStartSec: number): boolean {
    return event.startDaySec >= monthStartSec && event.startDaySec < nextMonthStartSec(monthStartSec);
  }

  function isMonthRangeEnd(event: RangeOverlayEvent, monthStartSec: number): boolean {
    const monthEndSec = nextMonthStartSec(monthStartSec) - 1;
    return event.endDaySec >= monthStartSec && event.endDaySec <= monthEndSec;
  }

  function formatEventRange(event: RangeOverlayEvent): string {
    return `${new Date(event.startDaySec * 1000).toLocaleDateString()} – ${new Date(event.endDaySec * 1000).toLocaleDateString()}`;
  }
</script>

<div class="rounded-lg border border-base-300 overflow-auto max-h-[calc(80vh-14rem)]">
  <ul class="divide-y divide-base-300">
    {#each monthlyItems as month (`month-${month.startSec}`)}
      {@const overlappingEvents = monthRangeEvents(month.startSec)}
      <li>
        <button
          type="button"
          class="w-full px-3 py-2 flex items-center justify-between text-sm hover:bg-base-200/40"
          onclick={() => onSelectMonth?.(month.startSec)}
        >
          <span class="min-w-0 pr-2">
            <span class="block">{month.label}</span>
            {#if overlappingEvents.length > 0}
              <span class="mt-1 block space-y-1">
                {#each overlappingEvents.slice(0, 2) as event (`month-${month.startSec}-${event.id}`)}
                  <span
                    class={`block h-[4px] bg-secondary/90 ${isMonthRangeStart(event, month.startSec) ? 'rounded-l-full' : ''} ${isMonthRangeEnd(event, month.startSec) ? 'rounded-r-full' : ''}`}
                    title={`${event.title} (${formatEventRange(event)})`}
                  ></span>
                {/each}
              </span>
            {/if}
          </span>
          <span class={`px-2 py-1 rounded-md text-xs ${intensityClass(month.count, maxBucketCount)}`}>
            {month.count} event{month.count === 1 ? '' : 's'}
          </span>
        </button>
      </li>
    {/each}
  </ul>
</div>
