<script lang="ts">
  import GalleryRow from './GalleryRow.svelte';
  import { popupGalleryEntries } from './galleryRegistry';
  import type { ViewportMode } from './types';
  import { T } from '$lib/design-system/tokens';

  const entries = popupGalleryEntries;
  let viewportMode = $state<ViewportMode>('phone');
</script>

<section style="position:sticky;top:8px;z-index:20;border-radius:14px;border:1px solid {T.hairlineSoft};background:{T.surface};padding:16px;display:flex;flex-direction:column;gap:8px;backdrop-filter:blur(8px);">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h2 style="font-size:16px;font-weight:580;margin:0;">Popup Gallery</h2>
      <p style="font-size:13px;color:{T.inkMuted};margin:0;">
        Interactive inventory of popup flows and standalone popup pages. All pages auto-embed inline and can also open in the popup host.
      </p>
    </div>

    <div role="tablist" aria-label="Viewport mode" style="display:flex;gap:4px;">
      <button
        style={viewportMode === 'phone'
          ? `height:32px;padding:0 14px;border-radius:9999px;border:0;background:${T.primary};color:#fff;font-size:12.5px;font-weight:580;cursor:pointer;`
          : `height:32px;padding:0 14px;border-radius:9999px;border:0;background:transparent;color:${T.inkMuted};font-size:12.5px;font-weight:580;cursor:pointer;`}
        onclick={() => (viewportMode = 'phone')}
      >
        Phone
      </button>
      <button
        style={viewportMode === 'tablet'
          ? `height:32px;padding:0 14px;border-radius:9999px;border:0;background:${T.primary};color:#fff;font-size:12.5px;font-weight:580;cursor:pointer;`
          : `height:32px;padding:0 14px;border-radius:9999px;border:0;background:transparent;color:${T.inkMuted};font-size:12.5px;font-weight:580;cursor:pointer;`}
        onclick={() => (viewportMode = 'tablet')}
      >
        Tablet
      </button>
    </div>
  </div>
</section>

<div style="display:flex;flex-direction:column;gap:16px;">
  {#each entries as entry (entry.id)}
    <GalleryRow {entry} {viewportMode} />
  {/each}
</div>
