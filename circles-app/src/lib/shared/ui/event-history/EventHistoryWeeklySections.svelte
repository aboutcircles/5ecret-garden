<script lang="ts">
  import { tick } from 'svelte';
  import type { MonthWeeklySection, RangeOverlayEvent } from './types';
  import { T } from '$lib/design-system/tokens.js';

  interface Props {
    weeklySections: MonthWeeklySection[];
    maxBucketCount: number;
    rangeEvents?: RangeOverlayEvent[];
    selectedWeekStartSec?: number | null;
    onSelectWeek?: (weekStartSec: number) => void;
  }

  let {
    weeklySections,
    maxBucketCount,
    rangeEvents = [],
    selectedWeekStartSec = null,
    onSelectWeek,
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

  function formatWeekRange(startSec: number): string {
    const endSec = startSec + 7 * 24 * 60 * 60 - 1;
    return `${new Date(startSec * 1000).toLocaleDateString()} – ${new Date(endSec * 1000).toLocaleDateString()}`;
  }

  function weekRangeEvents(weekStartSec: number): RangeOverlayEvent[] {
    const weekEndSec = weekStartSec + 7 * 24 * 60 * 60 - 1;
    return rangeEvents.filter((event) => event.startDaySec <= weekEndSec && event.endDaySec >= weekStartSec);
  }

  function isWeekRangeStart(event: RangeOverlayEvent, weekStartSec: number): boolean {
    return event.startDaySec >= weekStartSec && event.startDaySec < weekStartSec + 7 * 24 * 60 * 60;
  }

  function isWeekRangeEnd(event: RangeOverlayEvent, weekStartSec: number): boolean {
    const weekEndSec = weekStartSec + 7 * 24 * 60 * 60 - 1;
    return event.endDaySec >= weekStartSec && event.endDaySec <= weekEndSec;
  }

  function formatEventRange(event: RangeOverlayEvent): string {
    return `${new Date(event.startDaySec * 1000).toLocaleDateString()} – ${new Date(event.endDaySec * 1000).toLocaleDateString()}`;
  }

  $effect(() => {
    if (!selectedWeekStartSec) return;
    void scrollToSelectedWeek(selectedWeekStartSec);
  });

  async function scrollToSelectedWeek(weekStartSec: number): Promise<void> {
    await tick();
    if (!containerEl) return;
    const el = containerEl.querySelector<HTMLElement>(`[data-week-start="${weekStartSec}"]`);
    if (!el) return;
    const top = el.offsetTop - containerEl.offsetTop - 8;
    containerEl.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }
</script>

<div style="border-radius:8px;border:1px solid {T.hairlineSoft};padding:12px;overflow:auto;max-height:calc(80vh - 14rem);" bind:this={containerEl}>
  <div style="display:flex;flex-direction:column;gap:16px;">
    {#each weeklySections as section (section.key)}
      <section style="display:flex;flex-direction:column;gap:8px;">
        <div style="font-size:13px;font-weight:500;">{section.label}</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
          {#each section.weeks as week (`${section.key}-${week.startSec}`)}
            {@const overlappingEvents = weekRangeEvents(week.startSec)}
            <button
              type="button"
              data-week-start={week.startSec}
              style="position:relative;overflow:hidden;border-radius:6px;border:1px solid {selectedWeekStartSec === week.startSec ? 'rgba(88,73,212,0.8)' : T.hairlineSoft};padding:8px 12px;font-size:12px;cursor:pointer;text-align:left;width:100%;{selectedWeekStartSec === week.startSec ? 'box-shadow:0 0 0 2px rgba(88,73,212,0.3);' : ''}{intensityStyle(week.count, maxBucketCount)}"
              title={`${formatWeekRange(week.startSec)}: ${week.count} event${week.count === 1 ? '' : 's'}`}
              aria-label={`${formatWeekRange(week.startSec)}: ${week.count} events`}
              onclick={() => onSelectWeek?.(week.startSec)}
            >
              <div style="font-weight:500;">Week</div>
              <div style="opacity:0.8;">{formatWeekRange(week.startSec)}</div>
              <div style="margin-top:4px;">{week.count} event{week.count === 1 ? '' : 's'}</div>

              {#if overlappingEvents.length > 0}
                <div style="margin-top:8px;display:flex;flex-direction:column;gap:4px;">
                  {#each overlappingEvents.slice(0, 2) as event (`week-${week.startSec}-${event.id}`)}
                    <div
                      style="height:4px;background:rgba(16,185,129,0.9);{isWeekRangeStart(event, week.startSec) ? 'border-radius:9999px 0 0 9999px;' : ''}{isWeekRangeEnd(event, week.startSec) ? 'border-radius:0 9999px 9999px 0;' : ''}"
                      title={`${event.title} (${formatEventRange(event)})`}
                    ></div>
                  {/each}
                </div>
              {/if}
            </button>
          {/each}
        </div>
      </section>
    {/each}
  </div>
</div>
