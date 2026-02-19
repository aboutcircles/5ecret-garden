<script lang="ts">
  import type { Snippet } from 'svelte';
  import Markdown from '$lib/shared/ui/content/markdown/Markdown.svelte';

  type SizeVariant = 'sm' | 'md';

  interface Props {
    title: string;
    subtitle?: string;
    description?: string | null;
    imageUrl?: string | null;
    size?: SizeVariant;
    meta?: Snippet;
  }

  let {
    title,
    subtitle,
    description,
    imageUrl,
    size = 'md',
    meta,
  }: Props = $props();

  const imageSizeClass = $derived(size === 'sm' ? 'w-16 h-16' : 'w-20 h-20');
  const gapClass = $derived(size === 'sm' ? 'gap-3' : 'gap-4');
</script>

<div class={`flex items-start ${gapClass} min-w-0`}>
  <div class={`${imageSizeClass} rounded-lg bg-base-200 overflow-hidden flex items-center justify-center text-base-content/50 shrink-0`}>
    {#if imageUrl}
      <img src={imageUrl} alt={title} class="w-full h-full object-cover" />
    {:else}
      <span class="text-[10px] uppercase tracking-wide">No image</span>
    {/if}
  </div>

  <div class="flex-1 min-w-0 space-y-2">
    <div>
      <div class="text-sm font-semibold truncate">{title}</div>
      {#if subtitle}
        <div class="text-xs text-base-content/70 truncate">{subtitle}</div>
      {/if}
    </div>

    {#if description}
      <Markdown content={description} class="prose prose-sm max-w-none text-base-content/70" />
    {/if}

    {@render meta?.()}
  </div>
</div>
