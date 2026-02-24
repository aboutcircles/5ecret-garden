<script lang="ts">
  import GalleryRow from './GalleryRow.svelte';
  import { popupGalleryEntries } from './galleryRegistry';
  import type { ViewportMode } from './types';

  const entries = popupGalleryEntries;
  let viewportMode = $state<ViewportMode>('phone');
</script>

<section class="sticky top-2 z-20 rounded-xl border border-base-300 bg-base-100/95 backdrop-blur p-4 space-y-2">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h2 class="text-lg font-semibold">Popup Gallery</h2>
      <p class="text-sm opacity-75">
        Interactive inventory of popup flows and standalone popup pages. All pages auto-embed inline and can also open in the popup host.
      </p>
    </div>

    <div class="join" role="tablist" aria-label="Viewport mode">
      <button
        class="btn btn-sm join-item"
        class:btn-primary={viewportMode === 'phone'}
        class:btn-ghost={viewportMode !== 'phone'}
        onclick={() => (viewportMode = 'phone')}
      >
        Phone
      </button>
      <button
        class="btn btn-sm join-item"
        class:btn-primary={viewportMode === 'tablet'}
        class:btn-ghost={viewportMode !== 'tablet'}
        onclick={() => (viewportMode = 'tablet')}
      >
        Tablet
      </button>
    </div>
  </div>
</section>

<div class="space-y-4">
  {#each entries as entry (entry.id)}
    <GalleryRow {entry} {viewportMode} />
  {/each}
</div>
