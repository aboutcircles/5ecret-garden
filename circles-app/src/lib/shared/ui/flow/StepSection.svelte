<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    subtitle?: string;
    className?: string;
    titleClassName?: string;
    children?: Snippet;
  }

  let {
    title,
    subtitle,
    className = '',
    titleClassName = '',
    children,
  }: Props = $props();
</script>

<section class={`bg-base-100 border border-base-300 rounded-xl p-4 space-y-3 ${className}`.trim()}>
  {#if title || subtitle}
    <header class={titleClassName}>
      {#if title}
        <h3 class="text-sm font-semibold">{title}</h3>
      {/if}
      {#if subtitle}
        <p class="text-xs text-base-content/70 mt-0.5">{subtitle}</p>
      {/if}
    </header>
  {/if}

  {@render children?.()}
</section>
