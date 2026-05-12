<script lang="ts">
  import { circles } from '$lib/shared/state/circles';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
  import {
    ArrowRight,
    ArrowLeft,
    XCircle,
    RefreshCw,
    AlertCircle,
  } from 'lucide';
  import { getTimeAgo } from '$lib/shared/utils/shared';
  import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';
  import type { Sdk } from '@aboutcircles/sdk';
  import type { Address } from '@aboutcircles/sdk-types';
  import { PagedQuery } from '@aboutcircles/sdk-rpc';

  interface TrustEvent {
    address: Address;
    timestamp: number;
    direction: 'outgoing' | 'incoming';
    revoked: boolean;
    transactionHash: string;
  }

  const PAGE_SIZE = 25;

  let events = $state<TrustEvent[]>([]);
  let isLoading = $state(true);
  let isLoadingMore = $state(false);
  let error = $state<string | null>(null);
  let hasMore = $state(false);
  let sentinelEl: HTMLDivElement | null = $state(null);

  // Keep query + dedup state across pages
  let activeQuery: PagedQuery | null = null;
  let seenAddresses = new Set<string>();
  let myAddr = '';

  $effect(() => {
    const sdk = $circles;
    const avatar = avatarState.avatar;
    if (!sdk || !avatar?.address) return;
    initQuery(sdk as Sdk, avatar.address as Address);
  });

  // IntersectionObserver for scroll-based loading
  $effect(() => {
    if (!sentinelEl || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoadingMore && hasMore) {
          void loadNextPage();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinelEl);
    return () => observer.disconnect();
  });

  function initQuery(sdk: Sdk, address: Address) {
    myAddr = address.toLowerCase();
    seenAddresses = new Set();
    events = [];
    hasMore = false;
    activeQuery = sdk.rpc.trust.getTrustRelations(address, PAGE_SIZE);
    void loadNextPage(true);
  }

  async function loadNextPage(initial = false) {
    if (!activeQuery) return;
    if (initial) {
      isLoading = true;
    } else {
      isLoadingMore = true;
    }
    error = null;

    try {
      const gotResults = await activeQuery.queryNextPage();
      if (!gotResults) {
        hasMore = false;
        return;
      }

      const rows = activeQuery.currentPage?.results ?? [];
      hasMore = activeQuery.currentPage?.hasMore ?? false;

      const mapped = rows.map((row: any) => {
        const truster = (row.truster as string).toLowerCase();
        const isOutgoing = truster === myAddr;
        return {
          address: (isOutgoing ? row.trustee : row.truster) as Address,
          timestamp: Number(row.timestamp),
          direction: isOutgoing ? 'outgoing' : 'incoming',
          revoked: Number(row.expiryTime) === 0,
          transactionHash: row.transactionHash ?? '',
        } satisfies TrustEvent;
      });

      // Deduplicate across all pages (keep most recent per address)
      const newEvents = mapped.filter((e) => {
        const key = e.address.toLowerCase();
        if (seenAddresses.has(key)) return false;
        seenAddresses.add(key);
        return true;
      });

      events = [...events, ...newEvents];
    } catch (err) {
      console.error('[TrustEventsPanel] Failed to load trust history:', err);
      error = 'Failed to load trust history';
    } finally {
      isLoading = false;
      isLoadingMore = false;
    }
  }

  function refresh() {
    const sdk = $circles;
    const avatar = avatarState.avatar;
    if (sdk && avatar?.address) {
      initQuery(sdk as Sdk, avatar.address as Address);
    }
  }

  function describeEvent(e: TrustEvent): string {
    if (e.revoked) {
      return e.direction === 'outgoing' ? 'You untrusted' : 'Untrusted you';
    }
    return e.direction === 'outgoing' ? 'You trusted' : 'Trusted you';
  }
</script>

{#if isLoading}
  <div class="flex items-center justify-center py-12">
    <span class="loading loading-spinner loading-md"></span>
    <span class="ml-2 text-base-content/60">Loading trust history...</span>
  </div>
{:else if error && events.length === 0}
  <div class="flex flex-col items-center justify-center py-12 gap-4">
    <div class="flex items-center gap-2 text-error">
      <Lucide icon={AlertCircle} size={20} />
      <span>{error}</span>
    </div>
    <button class="btn btn-sm btn-ghost" onclick={refresh}>
      <Lucide icon={RefreshCw} size={16} />
      Retry
    </button>
  </div>
{:else if events.length === 0}
  <div class="flex flex-col items-center justify-center py-12 text-base-content/60">
    <p>No trust activity yet.</p>
    <p class="text-sm mt-1">Trust others to expand your Circles network.</p>
  </div>
{:else}
  <div class="flex items-center justify-end mb-3">
    <button class="btn btn-xs btn-ghost gap-1" onclick={refresh}>
      <Lucide icon={RefreshCw} size={14} />
      Refresh
    </button>
  </div>

  <div class="space-y-0.5">
    {#each events as event (event.transactionHash + event.address)}
      <div
        data-trust-event-row
        tabindex={0}
        role="button"
        aria-label={`Open profile for ${event.address}`}
        class="rounded-[var(--row-radius,0.75rem)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        onclick={() => openProfilePopup(event.address)}
        onkeydown={(e) => e.key === 'Enter' && openProfilePopup(event.address)}
      >
        <RowFrame clickable={true} dense={true} noLeading={true}>
          <div class="w-full flex items-center justify-between">
            <div class="min-w-0 flex items-center gap-2">
              <div class="shrink-0">
                {#if event.revoked}
                  <Lucide icon={XCircle} size={16} class="text-error" />
                {:else if event.direction === 'outgoing'}
                  <Lucide icon={ArrowRight} size={16} class="text-primary" />
                {:else}
                  <Lucide icon={ArrowLeft} size={16} class="text-success" />
                {/if}
              </div>
              <Avatar
                address={event.address}
                view="horizontal"
                clickable={true}
                topInfo={describeEvent(event)}
                bottomInfo={getTimeAgo(event.timestamp)}
              />
            </div>

            <div class="shrink-0" aria-hidden="true">
              <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" />
            </div>
          </div>
        </RowFrame>
      </div>
    {/each}

    <!-- Scroll sentinel for loading more -->
    {#if hasMore}
      <div bind:this={sentinelEl} class="flex items-center justify-center py-4">
        {#if isLoadingMore}
          <span class="loading loading-spinner loading-sm"></span>
          <span class="ml-2 text-xs text-base-content/50">Loading more...</span>
        {/if}
      </div>
    {/if}

    {#if error && events.length > 0}
      <div class="flex items-center justify-center gap-2 py-2 text-error text-xs">
        <span>{error}</span>
        <button class="btn btn-xs btn-ghost" onclick={() => void loadNextPage()}>Retry</button>
      </div>
    {/if}
  </div>
{/if}
