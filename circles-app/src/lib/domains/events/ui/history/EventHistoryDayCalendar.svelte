<script lang="ts">
  import { tick } from 'svelte';
  import type { MonthCalendar, RangeOverlayEvent } from './types';

  interface Props {
    monthCalendars: MonthCalendar[];
    maxBucketCount: number;
    rangeEvents?: RangeOverlayEvent[];
    selectedDayTsSec?: number | null;
    onSelectDay?: (dayStartTsSec: number) => void;
  }

  let {
    monthCalendars,
    maxBucketCount,
    rangeEvents = [],
    selectedDayTsSec = null,
    onSelectDay,
  }: Props = $props();

  let containerEl: HTMLDivElement | null = $state(null);

  function intensityClass(count: number, max: number): string {
    if (count <= 0 || max <= 0) return 'bg-base-300/50';
    const ratio = count / max;
    if (ratio <= 0.2) return 'bg-primary/25';
    if (ratio <= 0.4) return 'bg-primary/40';
    if (ratio <= 0.6) return 'bg-primary/55';
    if (ratio <= 0.8) return 'bg-primary/70';
    return 'bg-primary';
  }

  function dayRangeEvents(tsSec: number): RangeOverlayEvent[] {
    return rangeEvents.filter((event) => tsSec >= event.startDaySec && tsSec <= event.endDaySec);
  }

  function isRangeStart(event: RangeOverlayEvent, tsSec: number): boolean {
    return event.startDaySec === tsSec;
  }

  function isRangeEnd(event: RangeOverlayEvent, tsSec: number): boolean {
    return event.endDaySec === tsSec;
  }

  function formatEventRange(event: RangeOverlayEvent): string {
    return `${new Date(event.startDaySec * 1000).toLocaleDateString()} – ${new Date(event.endDaySec * 1000).toLocaleDateString()}`;
  }

  function cellTitle(tsSec: number, count: number, events: RangeOverlayEvent[]): string {
    const base = `${new Date(tsSec * 1000).toLocaleDateString()}: ${count} event${count === 1 ? '' : 's'}`;
    if (events.length === 0) return base;
    return `${base}\nKnown events: ${events.map((event) => event.title).join(', ')}`;
  }

  $effect(() => {
    if (!selectedDayTsSec) return;
    void scrollToSelectedDay(selectedDayTsSec);
  });

  async function scrollToSelectedDay(dayTsSec: number): Promise<void> {
    await tick();
    if (!containerEl) return;
    const el = containerEl.querySelector<HTMLElement>(`[data-day-start="${dayTsSec}"]`);
    if (!el) return;
    const top = el.offsetTop - containerEl.offsetTop - 8;
    containerEl.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }
</script>

<div class="rounded-lg border border-base-300 p-3 overflow-auto max-h-[calc(80vh-14rem)]" bind:this={containerEl}>
  <div class="space-y-4 min-w-max">
    {#each monthCalendars as month (month.key)}
      <section class="space-y-1">
        <div class="text-sm font-medium">{month.label}</div>
        <div class="grid grid-cols-7 gap-1 text-[10px] opacity-60 pl-[2px]">
          <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
        </div>

        <div class="space-y-1">
          {#each month.weeks as week, weekIndex (`${month.key}-${weekIndex}`)}
            <div class="grid grid-cols-7 gap-1">
              {#each week as cell (`${month.key}-${cell.tsSec}`)}
                {@const cellRangeEvents = cell.inCurrentMonth ? dayRangeEvents(cell.tsSec) : []}
                <button
                  type="button"
                  data-day-start={cell.tsSec}
                  class={`relative w-9 h-9 rounded-md border border-base-300 p-1 text-[10px] flex items-start justify-end overflow-hidden ${cell.inCurrentMonth ? intensityClass(cell.count, maxBucketCount) : 'bg-base-200/40 text-base-content/40'}`}
                  title={cell.inCurrentMonth ? cellTitle(cell.tsSec, cell.count, cellRangeEvents) : ''}
                  aria-label={cell.inCurrentMonth ? cellTitle(cell.tsSec, cell.count, cellRangeEvents) : 'Outside month'}
                  onclick={() => cell.inCurrentMonth && onSelectDay?.(cell.tsSec)}
                >
                  <span class="relative z-[1]">{cell.dayOfMonth}</span>

                  {#if cellRangeEvents.length > 0}
                    <div class="absolute inset-x-0 bottom-1 px-[2px] space-y-[2px]">
                      {#each cellRangeEvents.slice(0, 2) as event (`${cell.tsSec}-${event.id}`)}
                        <div
                          class={`h-[4px] bg-secondary/90 ${isRangeStart(event, cell.tsSec) ? 'rounded-l-full' : ''} ${isRangeEnd(event, cell.tsSec) ? 'rounded-r-full' : ''}`}
                          title={`${event.title} (${formatEventRange(event)})`}
                        ></div>
                      {/each}
                    </div>
                  {/if}
                </button>
              {/each}
            </div>
          {/each}
        </div>
      </section>
    {/each}

    {#if rangeEvents.length > 0}
      <section class="pt-1 space-y-1">
        <div class="text-[11px] opacity-70">Known events</div>
        <div class="space-y-1">
          {#each rangeEvents as event (event.id)}
            <div class="text-[11px] rounded-md border border-base-300 p-2">
              <div class="font-medium">{event.title}</div>
              <div class="opacity-70">{formatEventRange(event)}</div>
              {#if event.description}
                <div class="opacity-60">{event.description}</div>
              {/if}
            </div>
          {/each}
        </div>
      </section>
    {/if}
  </div>
</div>
