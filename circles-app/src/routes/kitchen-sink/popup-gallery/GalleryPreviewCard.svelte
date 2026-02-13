<script lang="ts">
  import type { GalleryStep, ViewportMode } from './types';

  interface Props {
    step: GalleryStep;
    viewportMode: ViewportMode;
  }

  let { step, viewportMode }: Props = $props();

  const stepProps = $derived(step.propsFactory ? step.propsFactory() : {});
  const viewport = $derived(
    viewportMode === 'phone'
      ? { width: 340, height: 740, label: 'Phone 9:19.5' }
      : { width: 520, height: 693, label: 'Tablet 3:4' }
  );
</script>

<article class="shrink-0 p-0 overflow-auto">
  <div
    class="rounded-md border border-base-300 bg-base-100 overflow-auto"
    style={`width:${viewport.width}px;height:${viewport.height}px`}
    aria-label={`${step.title} preview (${viewport.label})`}
  >
    <svelte:component this={step.component} {...stepProps} />
  </div>
</article>
