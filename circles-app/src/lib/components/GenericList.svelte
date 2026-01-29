<script lang="ts">
  import { onDestroy, type Component } from 'svelte';
  import type { EventRow } from '@aboutcircles/sdk-types';
  import type { TransactionHistoryRow } from '@aboutcircles/sdk-rpc';
  import { getKeyFromItem } from '$lib/stores/query/circlesQueryStore';
  import type { Readable } from 'svelte/store';

  interface Props<T extends Record<string, any> = any> {
    store?: Readable<{
      data: any[];
      next: () => Promise<boolean>;
      ended: boolean;
    }>;
    row: Component<T>;
    rowProps?: Record<string, any>;
    isInitialLoading?: boolean;
  }
  let { store, row, rowProps = {}, isInitialLoading = false }: Props = $props();

  let anchor: HTMLElement | undefined = $state();
  let isLoadingMore = $state(false);
  let observer: IntersectionObserver | null = null;

  async function loadMore() {
    if (!$store || $store.ended || isLoadingMore) return;
    isLoadingMore = true;
    try {
      await $store.next();
    } finally {
      isLoadingMore = false;
    }
  }

  // Simple intersection observer - triggers once when anchor visible
  $effect(() => {
    if (!anchor || !store) return;

    observer?.disconnect();

    if ($store?.ended) return;

    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoadingMore && !$store?.ended) {
          loadMore();
        }
      },
      { rootMargin: '50px' }
    );
    observer.observe(anchor);
  });

  onDestroy(() => {
    observer?.disconnect();
  });
</script>

<div class="w-full flex flex-col gap-y-1.5 py-2" role="list">
  {#each $store?.data ?? [] as item, index (getKeyFromItem(item) + '-' + index)}
    {@const SvelteComponent_1 = row}
    <SvelteComponent_1 {item} {...rowProps} />
  {/each}

  <div bind:this={anchor} class="text-center py-4">
    {#if isInitialLoading}
      <!-- Initial load spinner -->
      <div class="flex items-center justify-center gap-2 py-4">
        <span class="loading loading-spinner loading-md"></span>
        <span class="text-base-content/60">Loading...</span>
      </div>
    {:else if isLoadingMore}
      <!-- Loading more spinner -->
      <div class="flex items-center justify-center gap-2 py-2">
        <span class="loading loading-spinner loading-sm"></span>
        <span class="text-sm text-base-content/70">Loading more...</span>
      </div>
    {:else if ($store?.data ?? []).length === 0 && $store?.ended}
      <span class="text-base-content/70">No items</span>
    {:else if $store?.ended}
      <span class="text-base-content/70">End of list</span>
    {/if}
  </div>
</div>
