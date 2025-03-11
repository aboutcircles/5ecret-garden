<script lang="ts">
  import {
    onDestroy,
    type SvelteComponent,
    createEventDispatcher,
  } from 'svelte';
  import type { EventRow, TransactionHistoryRow } from '@circles-sdk/data';
  import { getKeyFromItem } from '$lib/stores/query/circlesQueryStore';
  import type { Readable } from 'svelte/store';

  export let store: Readable<{
    data: EventRow[] | TransactionHistoryRow[];
    next: () => Promise<boolean>;
    ended: boolean;
  }>;
  export let row: typeof SvelteComponent<Record<string, any>>;

  let observer: IntersectionObserver | null = null;
  let anchor: HTMLElement | undefined;

  let hasError = false;
  const eventDispatcher = createEventDispatcher();

  const setupObserver = () => {
    if (observer) observer.disconnect();

    if (anchor && !$store?.ended && !hasError) {
      observer = new IntersectionObserver(async (entries) => {
        if (entries[0]?.isIntersecting && !$store.ended) {
          observer?.disconnect();
          try {
            await $store.next();
            hasError = false;
          } catch (error) {
            hasError = true;
            console.error('Error loading more items:', error);
          }
          setupObserver();
        }
      });

      observer.observe(anchor);
    }
  };

  const handleRetry = async () => {
    try {
      await $store.next();
      hasError = false;
      setupObserver();
    } catch (error) {
      console.error('Error retrying load:', error);
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
    aria-busy={$store && !$store?.ended && !hasError ? 'true' : 'false'}
  >
    {#if ($store?.data ?? []).length === 0 || $store?.ended}
      <span class="text-gray-500">End of list</span>
    {:else if hasError}
      <span class="text-red-500">Error loading items</span>
      <button class="ml-2 text-primary hover:underline" on:click={handleRetry}>
        Retry
      </button>
    {:else}
      <span class="loading loading-spinner text-primary"></span>
      <span class="ml-2 text-gray-500">Loading more...</span>
    {/if}
  </div>
</div>
