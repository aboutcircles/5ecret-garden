<script lang="ts">
  import { tick } from 'svelte';
  import type { MonthWeeklySection } from './types';

  interface Props {
    weeklySections: MonthWeeklySection[];
    maxBucketCount: number;
    selectedWeekStartSec?: number | null;
    onSelectWeek?: (weekStartSec: number) => void;
  }

  let {
    weeklySections,
    maxBucketCount,
    selectedWeekStartSec = null,
    onSelectWeek,
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

  function formatWeekRange(startSec: number): string {
    const endSec = startSec + 7 * 24 * 60 * 60 - 1;
    return `${new Date(startSec * 1000).toLocaleDateString()} – ${new Date(endSec * 1000).toLocaleDateString()}`;
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

<div class="rounded-lg border border-base-300 p-3 overflow-auto max-h-[calc(80vh-14rem)]" bind:this={containerEl}>
  <div class="space-y-4">
    {#each weeklySections as section (section.key)}
      <section class="space-y-2">
        <div class="text-sm font-medium">{section.label}</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {#each section.weeks as week (`${section.key}-${week.startSec}`)}
            <button
              type="button"
              data-week-start={week.startSec}
              class={`rounded-md border px-3 py-2 text-xs ${intensityClass(week.count, maxBucketCount)} ${selectedWeekStartSec === week.startSec ? 'border-primary ring-1 ring-primary/50' : 'border-base-300'}`}
              title={`${formatWeekRange(week.startSec)}: ${week.count} event${week.count === 1 ? '' : 's'}`}
              aria-label={`${formatWeekRange(week.startSec)}: ${week.count} events`}
              onclick={() => onSelectWeek?.(week.startSec)}
            >
              <div class="font-medium">Week</div>
              <div class="opacity-80">{formatWeekRange(week.startSec)}</div>
              <div class="mt-1">{week.count} event{week.count === 1 ? '' : 's'}</div>
            </button>
          {/each}
        </div>
      </section>
    {/each}
  </div>
</div>
