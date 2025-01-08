<script lang="ts">
  import { onDestroy, type SvelteComponent, createEventDispatcher } from 'svelte';
  import type { EventRow } from '@circles-sdk/data';
  import { getKeyFromItem } from '$lib/stores/query/circlesQueryStore';
  import type { Readable } from 'svelte/store';

  export let store: Readable<{
    data: EventRow[];
    next: () => Promise<boolean>;
    ended: boolean;
  }>;
  export let row: typeof SvelteComponent<Record<string, any>>;

  let observer: IntersectionObserver | null = null;
  let anchor: HTMLElement | undefined;

  const eventDispatcher = createEventDispatcher();

  const setupObserver = () => {
    if (observer) observer.disconnect();

    if (anchor && !$store?.ended) {
      observer = new IntersectionObserver(async (entries) => {
        if (entries[0]?.isIntersecting && !$store.ended) {
          observer?.disconnect();
          await $store.next();
          setupObserver();
        }
      });

      observer.observe(anchor);
    }
  };

  $: {
    if (store && anchor) setupObserver();
  }

  onDestroy(() => {
    observer?.disconnect();
    observer = null;
  });
</script>

<div class="w-full flex flex-col divide-y gap-y-2 overflow-x-auto py-4">
  {#each $store?.data ?? [] as item (getKeyFromItem(item))}
    <button
      on:click={() => eventDispatcher('select', item)}
      class="w-full pt-2"
      aria-label="Select item"
    >
      <svelte:component this={row} {item} />
    </button>
  {/each}

  <div
    class="text-center py-4"
    bind:this={anchor}
    aria-live="polite"
    aria-busy={$store && !$store?.ended ? "true" : "false"}
  >
    {#if ($store?.data ?? []).length === 0 || $store?.ended}
      <span class="text-gray-500">End of list</span>
    {:else}
      <span class="loading loading-spinner text-primary"></span>
      <span class="ml-2 text-gray-500">Loading more...</span>
    {/if}
  </div>
</div>
