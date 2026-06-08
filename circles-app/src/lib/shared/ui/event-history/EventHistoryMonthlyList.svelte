<script lang="ts">
  import type { MonthlyItem, RangeOverlayEvent } from './types';
  import { T } from '$lib/design-system/tokens.js';

  interface Props {
    monthlyItems: MonthlyItem[];
    maxBucketCount: number;
    rangeEvents?: RangeOverlayEvent[];
    onSelectMonth?: (monthStartSec: number) => void;
  }

  let { monthlyItems, maxBucketCount, rangeEvents = [], onSelectMonth }: Props = $props();

  function intensityStyle(count: number, max: number): string {
    if (count <= 0 || max <= 0) return 'background:rgba(0,0,0,0.08);';
    const ratio = count / max;
    if (ratio <= 0.2) return 'background:rgba(88,73,212,0.25);';
    if (ratio <= 0.4) return 'background:rgba(88,73,212,0.40);';
    if (ratio <= 0.6) return 'background:rgba(88,73,212,0.55);';
    if (ratio <= 0.8) return 'background:rgba(88,73,212,0.70);';
    return `background:${T.primary};`;
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

<div style="border-radius:10px;border:1px solid {T.hairlineSoft};overflow:auto;max-height:calc(80vh - 14rem);">
  <ul style="list-style:none;margin:0;padding:0;">
    {#each monthlyItems as month (`month-${month.startSec}`)}
      {@const overlappingEvents = monthRangeEvents(month.startSec)}
      <li style="border-top:1px solid {T.hairlineSoft};">
        <button
          type="button"
          class="monthlylist-row"
          style="width:100%;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;font-size:14px;background:none;border:0;cursor:pointer;text-align:left;"
          onclick={() => onSelectMonth?.(month.startSec)}
        >
          <span style="min-width:0;padding-right:8px;">
            <span style="display:block;">{month.label}</span>
            {#if overlappingEvents.length > 0}
              <span style="margin-top:4px;display:flex;flex-direction:column;gap:4px;">
                {#each overlappingEvents.slice(0, 2) as event (`month-${month.startSec}-${event.id}`)}
                  <span
                    style={`display:block;height:4px;background:rgba(88,73,212,0.7);${isMonthRangeStart(event, month.startSec) ? 'border-radius:9999px 0 0 9999px;' : ''}${isMonthRangeEnd(event, month.startSec) ? 'border-radius:0 9999px 9999px 0;' : ''}`}
                    title={`${event.title} (${formatEventRange(event)})`}
                  ></span>
                {/each}
              </span>
            {/if}
          </span>
          <span style="padding:4px 8px;border-radius:6px;font-size:12px;{intensityStyle(month.count, maxBucketCount)}">
            {month.count} event{month.count === 1 ? '' : 's'}
          </span>
        </button>
      </li>
    {/each}
  </ul>
</div>

<style>
  .monthlylist-row:hover { background: rgba(0,0,0,0.04); }
</style>
