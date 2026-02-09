<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    onOpen: () => void;
    srLabel?: string;
    children?: Snippet;
  }

  let { onOpen, srLabel, children }: Props = $props();
</script>

<button
  type="button"
  class="w-full bg-base-100 border shadow-sm rounded-xl px-3 md:px-4 py-2 md:py-2.5 flex items-center justify-between cursor-pointer hover:bg-base-200/40 transition-colors text-left"
  onclick={onOpen}
>
  <div class="flex flex-col min-w-0 mr-3">
    {@render children?.()}
  </div>
  <div class="shrink-0 flex items-center gap-2">
    <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" aria-hidden="true" />
  </div>

  {#if srLabel}
    <div class="sr-only">{srLabel}</div>
  {/if}
</button>
