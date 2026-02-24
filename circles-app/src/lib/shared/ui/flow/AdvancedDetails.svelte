<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    subtitle?: string;
    open?: boolean;
    className?: string;
    children?: Snippet;
  }

  let {
    title = 'Advanced details',
    subtitle,
    open = false,
    className = '',
    children,
  }: Props = $props();
</script>

<details class={`rounded-xl border border-base-300 bg-base-100/60 p-3 ${className}`.trim()} {open}>
  <summary class="cursor-pointer text-xs font-semibold uppercase tracking-wide text-base-content/60 list-none">
    <span class="inline-flex items-center gap-2">
      <span>{title}</span>
      {#if subtitle}
        <span class="normal-case text-[11px] font-normal opacity-70">{subtitle}</span>
      {/if}
    </span>
  </summary>
  <div class="mt-3 text-sm text-base-content/80 space-y-2">
    {@render children?.()}
  </div>
</details>
 
<style>
  summary::-webkit-details-marker {
    display: none;
  }
</style>
