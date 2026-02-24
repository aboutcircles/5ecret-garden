<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    align?: 'end' | 'between';
    stackOnMobile?: boolean;
    className?: string;
    primary?: Snippet;
    secondary?: Snippet;
    children?: Snippet;
  }

  let {
    align = 'end',
    stackOnMobile = true,
    className = '',
    primary,
    secondary,
    children,
  }: Props = $props();

  const layoutClass = $derived(
    stackOnMobile
      ? `flex flex-col sm:flex-row gap-2 ${align === 'between' ? 'sm:justify-between' : 'sm:justify-end'}`
      : `flex flex-row gap-2 ${align === 'between' ? 'justify-between' : 'justify-end'}`,
  );
</script>

<div class={`mt-5 ${layoutClass} ${className}`.trim()}>
  {@render children?.()}
  {@render secondary?.()}
  {@render primary?.()}
</div>
