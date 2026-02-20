<script lang="ts">
  import type { GalleryEntry, ViewportMode } from './types';
  import GalleryPreviewCard from './GalleryPreviewCard.svelte';

  interface Props {
    entry: GalleryEntry;
    viewportMode: ViewportMode;
  }

  let { entry, viewportMode }: Props = $props();

  const steps = $derived(entry.kind === 'flow' ? entry.steps : [entry.step]);
</script>

<section
  class="rounded-xl border border-base-300 bg-base-100 p-4 space-y-3"
  data-popup-gallery-row={entry.id}
  data-popup-gallery-kind={entry.kind}
>
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h3 class="text-base font-semibold">{entry.label}</h3>
      <p class="text-xs opacity-70 mt-1">{entry.purpose}</p>

      {#if entry.details}
        <details class="mt-2">
          <summary class="text-xs font-semibold opacity-80 cursor-pointer select-none">Flow details</summary>
          <div class="mt-2 text-xs opacity-80 whitespace-pre-wrap leading-relaxed">{entry.details}</div>
        </details>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      <span class="badge badge-outline badge-sm">{entry.domain}</span>
      <span class="badge badge-ghost badge-sm">{entry.kind === 'flow' ? `${steps.length} steps` : 'standalone'}</span>
    </div>
  </div>

  <div class="overflow-x-auto">
    <div class="flex gap-3 min-w-max pb-1">
      {#each steps as step (step.id)}
        <GalleryPreviewCard {step} {viewportMode} />
      {/each}
    </div>
  </div>

  {#if entry.entrypoints?.length}
    <div class="rounded-lg border border-base-300 bg-base-50/40 p-3">
      <div class="text-[11px] font-semibold uppercase tracking-wide opacity-60 mb-2">Entrypoints</div>
      <ul class="space-y-1">
        {#each entry.entrypoints as ep}
          <li class="text-xs font-mono opacity-80 break-all">{ep}</li>
        {/each}
      </ul>
    </div>
  {/if}
</section>
