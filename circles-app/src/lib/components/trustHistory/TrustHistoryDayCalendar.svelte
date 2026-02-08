<script lang="ts">
  import { tick } from 'svelte';
  import type { MonthCalendar } from './types';

  interface Props {
    monthCalendars: MonthCalendar[];
    maxBucketCount: number;
    selectedDayTsSec?: number | null;
    onSelectDay?: (dayStartTsSec: number) => void;
  }

  let { monthCalendars, maxBucketCount, selectedDayTsSec = null, onSelectDay }: Props = $props();
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

  function cellTitle(tsSec: number, count: number): string {
    return `${new Date(tsSec * 1000).toLocaleDateString()}: ${count} event${count === 1 ? '' : 's'}`;
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
                <button
                  type="button"
                  data-day-start={cell.tsSec}
                  class={`w-9 h-9 rounded-md border border-base-300 p-1 text-[10px] flex items-start justify-end ${cell.inCurrentMonth ? intensityClass(cell.count, maxBucketCount) : 'bg-base-200/40 text-base-content/40'}`}
                  title={cell.inCurrentMonth ? cellTitle(cell.tsSec, cell.count) : ''}
                  aria-label={cell.inCurrentMonth ? cellTitle(cell.tsSec, cell.count) : 'Outside month'}
                  onclick={() => cell.inCurrentMonth && onSelectDay?.(cell.tsSec)}
                >
                  {cell.dayOfMonth}
                </button>
              {/each}
            </div>
          {/each}
        </div>
      </section>
    {/each}
  </div>
</div>
