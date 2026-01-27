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
    /** Additional props to pass to each row component */
    rowProps?: Record<string, any>;
    /** Show initial loading spinner (before any data loads) */
    isInitialLoading?: boolean;
  }
  let { store, row, rowProps = {}, isInitialLoading = false }: Props = $props();

  let observer: IntersectionObserver | null = null;
  let anchor: HTMLElement | undefined = $state();
  let hasError = $state(false);
  let isLoadingMore = $state(false);

  const setupObserver = () => {
    if (observer) observer.disconnect();
    if (anchor && store && !$store?.ended && !hasError && !isLoadingMore) {
      observer = new IntersectionObserver(async (entries) => {
        if (entries[0]?.isIntersecting && $store && !$store.ended && !isLoadingMore) {
          observer?.disconnect();
          isLoadingMore = true;
          try {
            await $store.next();
            hasError = false;
          } catch {
            hasError = true;
          } finally {
            isLoadingMore = false;
          }
          setupObserver();
        }
      });
      observer.observe(anchor);
    }
  };
  const handleRetry = async () => {
    if (!$store || isLoadingMore) return;
    isLoadingMore = true;
    try {
      await $store.next();
      hasError = false;
      setupObserver();
    } catch {
      // Error handled by hasError state
    } finally {
      isLoadingMore = false;
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

{#if isLoadingMore}
  <div
    class="fixed bottom-24 left-1/2 -translate-x-1/2 bg-base-100 shadow-lg rounded-full px-4 py-2 flex items-center gap-2 z-40"
  >
    <span class="loading loading-spinner loading-sm text-primary"></span>
    <span class="text-sm">Loading more...</span>
  </div>
{/if}

<div class="w-full flex flex-col gap-y-1.5 py-2" role="list">
  {#each $store?.data ?? [] as item, index (getKeyFromItem(item) + '-' + index)}
    {@const SvelteComponent_1 = row}
    <SvelteComponent_1 {item} {...rowProps} />
  {/each}

  <div
    class="text-center py-4"
    bind:this={anchor}
    aria-live="polite"
    aria-busy={$store && !$store?.ended && !hasError ? 'true' : 'false'}
  >
    {#if isInitialLoading}
      <div class="flex justify-center py-4">
        <span class="loading loading-spinner loading-lg text-primary"></span>
      </div>
    {:else if ($store?.data ?? []).length === 0 && $store?.ended}
      <span class="text-base-content/70">No items</span>
    {:else if $store?.ended}
      <span class="text-base-content/70">End of list</span>
    {:else if hasError}
      <span class="text-error">Error loading items</span>
      <button class="ml-2 link link-primary" onclick={handleRetry}>Retry</button>
    {:else if isLoadingMore}
      <!-- Loading in progress - floating pill already visible, keep this minimal -->
      <span class="text-base-content/50 text-sm">Loading...</span>
    {:else}
      <!-- Idle state - show Load More button for manual trigger -->
      <button
        class="btn btn-ghost btn-sm text-base-content/70"
        onclick={handleRetry}
      >
        Load More
      </button>
    {/if}
  </div>
</div>
