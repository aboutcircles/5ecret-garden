<script lang="ts">
  import Markdown from '$lib/shared/ui/content/markdown/Markdown.svelte';
  import { T } from '$lib/design-system/tokens.js';

  type SizeVariant = 'sm' | 'md';

  interface Props {
    title: string;
    subtitle?: string;
    description?: string | null;
    imageUrl?: string | null;
    size?: SizeVariant;
  }

  let {
    title,
    subtitle,
    description,
    imageUrl,
    size = 'md',
  }: Props = $props();

  const imageSize = $derived(size === 'sm' ? 64 : 80);
  const gap = $derived(size === 'sm' ? 12 : 16);
</script>

<div style="display:flex;align-items:flex-start;gap:{gap}px;min-width:0;">
  <div style="width:{imageSize}px;height:{imageSize}px;border-radius:8px;background:{T.pageDeep};overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
    {#if imageUrl}
      <img src={imageUrl} alt={title} style="width:100%;height:100%;object-fit:cover;" />
    {:else}
      <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:{T.inkFaint};">No image</span>
    {/if}
  </div>

  <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:8px;">
    <div>
      <div style="font-size:13px;font-weight:580;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:{T.ink};">{title}</div>
      {#if subtitle}
        <div style="font-size:11.5px;color:{T.inkMuted};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{subtitle}</div>
      {/if}
    </div>

    {#if description}
      <Markdown content={description} />
    {/if}

    <slot name="meta" />
  </div>
</div>
