<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    description?: string;
    actions?: Snippet;
    children?: Snippet;
  }

  let { title, description = '', actions, children }: Props = $props();
</script>

<section class="card bg-base-200 p-5 space-y-4">
  <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <h2 class="font-bold">{title}</h2>
      {#if description}
        <p class="text-sm opacity-70 mt-1">{description}</p>
      {/if}
    </div>
    <div class="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
      {@render actions?.()}
    </div>
  </header>
  <div class="space-y-3">
    {@render children?.()}
  </div>
</section>
