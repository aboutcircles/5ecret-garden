<script lang="ts">
  import { tick } from 'svelte';
  import type { MonthCalendar, RangeOverlayEvent } from './types';
  import { T } from '$lib/design-system/tokens.js';

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

  function intensityStyle(count: number, max: number): string {
    if (count <= 0 || max <= 0) return 'background:rgba(0,0,0,0.06);';
    const ratio = count / max;
    if (ratio <= 0.2) return 'background:rgba(88,73,212,0.18);';
    if (ratio <= 0.4) return 'background:rgba(88,73,212,0.32);';
    if (ratio <= 0.6) return 'background:rgba(88,73,212,0.48);';
    if (ratio <= 0.8) return 'background:rgba(88,73,212,0.65);';
    return 'background:rgba(88,73,212,1);color:#fff;';
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

<div style="border-radius:8px;border:1px solid {T.hairlineSoft};padding:12px;overflow:auto;max-height:calc(80vh - 14rem);" bind:this={containerEl}>
  <div style="display:flex;flex-direction:column;gap:16px;min-width:max-content;">
    {#each monthCalendars as month (month.key)}
      <section style="display:flex;flex-direction:column;gap:4px;">
        <div style="font-size:13px;font-weight:500;">{month.label}</div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;font-size:10px;opacity:0.6;padding-left:2px;">
          <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
        </div>

        <div style="display:flex;flex-direction:column;gap:4px;">
          {#each month.weeks as week, weekIndex (`${month.key}-${weekIndex}`)}
            <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">
              {#each week as cell (`${month.key}-${cell.tsSec}`)}
                {@const cellRangeEvents = cell.inCurrentMonth ? dayRangeEvents(cell.tsSec) : []}
                <button
                  type="button"
                  data-day-start={cell.tsSec}
                  style="position:relative;width:36px;height:36px;border-radius:6px;border:1px solid {T.hairlineSoft};padding:4px;font-size:10px;display:flex;align-items:flex-start;justify-content:flex-end;overflow:hidden;cursor:pointer;{cell.inCurrentMonth ? intensityStyle(cell.count, maxBucketCount) : 'background:rgba(0,0,0,0.04);color:rgba(0,0,0,0.3);'}"
                  title={cell.inCurrentMonth ? cellTitle(cell.tsSec, cell.count, cellRangeEvents) : ''}
                  aria-label={cell.inCurrentMonth ? cellTitle(cell.tsSec, cell.count, cellRangeEvents) : 'Outside month'}
                  onclick={() => cell.inCurrentMonth && onSelectDay?.(cell.tsSec)}
                >
                  <span style="position:relative;z-index:1;">{cell.dayOfMonth}</span>

                  {#if cellRangeEvents.length > 0}
                    <div style="position:absolute;left:0;right:0;bottom:4px;padding:0 2px;display:flex;flex-direction:column;gap:2px;">
                      {#each cellRangeEvents.slice(0, 2) as event (`${cell.tsSec}-${event.id}`)}
                        <div
                          style="height:4px;background:rgba(16,185,129,0.9);{isRangeStart(event, cell.tsSec) ? 'border-radius:9999px 0 0 9999px;' : ''}{isRangeEnd(event, cell.tsSec) ? 'border-radius:0 9999px 9999px 0;' : ''}"
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
      <section style="padding-top:4px;display:flex;flex-direction:column;gap:4px;">
        <div style="font-size:11px;opacity:0.7;">Known events</div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          {#each rangeEvents as event (event.id)}
            <div style="font-size:11px;border-radius:6px;border:1px solid {T.hairlineSoft};padding:8px;">
              <div style="font-weight:500;">{event.title}</div>
              <div style="opacity:0.7;">{formatEventRange(event)}</div>
              {#if event.description}
                <div style="opacity:0.6;">{event.description}</div>
              {/if}
            </div>
          {/each}
        </div>
      </section>
    {/if}
  </div>
</div>
