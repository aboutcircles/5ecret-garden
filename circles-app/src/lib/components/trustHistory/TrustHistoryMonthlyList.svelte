<script lang="ts">
  import type { MonthlyItem } from './types';

  interface Props {
    monthlyItems: MonthlyItem[];
    maxBucketCount: number;
    onSelectMonth?: (monthStartSec: number) => void;
  }

  let { monthlyItems, maxBucketCount, onSelectMonth }: Props = $props();

  function intensityClass(count: number, max: number): string {
    if (count <= 0 || max <= 0) return 'bg-base-300/50';
    const ratio = count / max;
    if (ratio <= 0.2) return 'bg-primary/25';
    if (ratio <= 0.4) return 'bg-primary/40';
    if (ratio <= 0.6) return 'bg-primary/55';
    if (ratio <= 0.8) return 'bg-primary/70';
    return 'bg-primary';
  }
</script>

<div class="rounded-lg border border-base-300 overflow-auto max-h-[calc(80vh-14rem)]">
  <ul class="divide-y divide-base-300">
    {#each monthlyItems as month (`month-${month.startSec}`)}
      <li>
        <button
          type="button"
          class="w-full px-3 py-2 flex items-center justify-between text-sm hover:bg-base-200/40"
          onclick={() => onSelectMonth?.(month.startSec)}
        >
          <span>{month.label}</span>
          <span class={`px-2 py-1 rounded-md text-xs ${intensityClass(month.count, maxBucketCount)}`}>
            {month.count} event{month.count === 1 ? '' : 's'}
          </span>
        </button>
      </li>
    {/each}
  </ul>
</div>
