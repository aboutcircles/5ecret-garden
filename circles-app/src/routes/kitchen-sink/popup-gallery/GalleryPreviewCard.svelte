<script lang="ts">
  import type { GalleryStep, ViewportMode } from './types';

  interface Props {
    step: GalleryStep;
    viewportMode: ViewportMode;
  }

  import { T } from '$lib/design-system/tokens';

  let { step, viewportMode }: Props = $props();

  const stepProps = $derived(step.propsFactory ? step.propsFactory() : {});
  const viewport = $derived(
    viewportMode === 'phone'
      ? { width: 340, height: 740, label: 'Phone 9:19.5' }
      : { width: 520, height: 693, label: 'Tablet 3:4' }
  );
</script>

<article style="flex-shrink:0;padding:0;overflow:auto;">
  <div
    style={`border-radius:6px;border:1px solid ${T.hairlineSoft};background:${T.surface};overflow:auto;width:${viewport.width}px;height:${viewport.height}px`}
    aria-label={`${step.title} preview (${viewport.label})`}
  >
    <svelte:component this={step.component} {...stepProps} />
  </div>
</article>
