<script lang="ts">
  import type { GalleryEntry, ViewportMode } from './types';
  import GalleryPreviewCard from './GalleryPreviewCard.svelte';

  interface Props {
    entry: GalleryEntry;
    viewportMode: ViewportMode;
  }

  import { T } from '$lib/design-system/tokens';

  let { entry, viewportMode }: Props = $props();

  const steps = $derived(entry.kind === 'flow' ? entry.steps : [entry.step]);
</script>

<section
  style="border-radius:14px;border:1px solid {T.hairlineSoft};background:{T.surface};padding:16px;display:flex;flex-direction:column;gap:12px;"
  data-popup-gallery-row={entry.id}
  data-popup-gallery-kind={entry.kind}
>
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h3 style="font-size:13px;font-weight:500;margin:0;">{entry.label}</h3>
      <p style="font-size:11.5px;color:{T.inkMuted};margin-top:4px;">{entry.purpose}</p>

      {#if entry.details}
        <details style="margin-top:8px;">
          <summary style="font-size:11.5px;font-weight:580;color:{T.inkMuted};cursor:pointer;user-select:none;">Flow details</summary>
          <div style="margin-top:8px;font-size:11.5px;color:{T.inkMuted};white-space:pre-wrap;line-height:1.5;">{entry.details}</div>
        </details>
      {/if}
    </div>
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="display:inline-block;border:1px solid {T.hairline};color:{T.inkMuted};border-radius:9999px;padding:2px 8px;font-size:11px;font-weight:540;">{entry.domain}</span>
      <span style="display:inline-block;border:1px solid {T.hairline};color:{T.inkMuted};border-radius:9999px;padding:2px 8px;font-size:11px;font-weight:540;">{entry.kind === 'flow' ? `${steps.length} steps` : 'standalone'}</span>
    </div>
  </div>

  <div style="overflow-x:auto;">
    <div style="display:flex;gap:12px;min-width:max-content;padding-bottom:4px;">
      {#each steps as step (step.id)}
        <GalleryPreviewCard {step} {viewportMode} />
      {/each}
    </div>
  </div>

  {#if entry.entrypoints?.length}
    <div style="border-radius:8px;border:1px solid {T.hairlineSoft};padding:12px;background:{T.pageDeep};">
      <div style="font-size:11px;font-weight:580;text-transform:uppercase;letter-spacing:0.05em;color:{T.inkMuted};margin-bottom:8px;">Entrypoints</div>
      <ul style="display:flex;flex-direction:column;gap:4px;list-style:none;margin:0;padding:0;">
        {#each entry.entrypoints as ep}
          <li style="font-size:11.5px;font-family:monospace;color:{T.inkMuted};word-break:break-all;">{ep}</li>
        {/each}
      </ul>
    </div>
  {/if}
</section>
