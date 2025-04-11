<script lang="ts">
  import {
    onDestroy,
    type Component,
  } from 'svelte';
  import type { EventRow, TransactionHistoryRow } from '@circles-sdk/data';
  import { getKeyFromItem } from '$lib/stores/query/circlesQueryStore';
  import type { Readable } from 'svelte/store';

  interface Props<T extends Record<string, any> = any> {
    store: Readable<{
      data: EventRow[] | TransactionHistoryRow[];
      next: () => Promise<boolean>;
      ended: boolean;
    }>;
    row: Component<T>;
  }

  let { store, row }: Props = $props();

  let observer: IntersectionObserver | null = null;
  let anchor: HTMLElement | undefined = $state();

  let hasError = $state(false);

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

  $effect(() => {
    if (store && anchor) setupObserver();
  });

  onDestroy(() => {
    observer?.disconnect();
    observer = null;
  });
</script>

<div class="w-full flex flex-col divide-y gap-y-2 overflow-x-auto py-4">
  {#each $store?.data ?? [] as item (getKeyFromItem(item))}
    {@const SvelteComponent_1 = row}
    <button
      onclick={() => {}}
      class="w-full pt-2"
      aria-label="Select item"
    >
      <SvelteComponent_1 {item} />
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
      <button class="ml-2 text-primary hover:underline" onclick={handleRetry}>
        Retry
      </button>
    {:else}
      <span class="loading loading-spinner text-primary"></span>
      <span class="ml-2 text-gray-500">Loading more...</span>
    {/if}
  </div>
</div>
