<script lang="ts">
  import GenericList from '$lib/shared/ui/lists/GenericList.svelte';
  import GroupedTransactionRow from './GroupedTransactionRow.svelte';
  import { groupedTransactionHistory } from '$lib/shared/state/transactionHistory';
  import { ChevronDown as LChevronDown, ChevronUp as LChevronUp, Flame, RefreshCw, ArrowLeftRight } from 'lucide';
  import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
  import { browser } from '$app/environment';
  import { writable } from 'svelte/store';

  interface Props {
    /** Transaction hash to highlight (from URL deep-link) */
    highlightTx?: string;
  }

  let { highlightTx }: Props = $props();

  // Track if we're searching for the highlighted tx
  let isSearchingForTx = $state(false);
  let searchAttempts = $state(0);
  const MAX_SEARCH_PAGES = 10; // Don't load more than 10 extra pages

  // Legend visibility - default to open, persist in localStorage
  const LEGEND_STORAGE_KEY = 'txHistory.legendOpen';
  let showLegend = $state(
    browser ? localStorage.getItem(LEGEND_STORAGE_KEY) !== 'false' : true
  );

  // Filter: hide intermediary hops by default
  const HIDE_HOPS_KEY = 'txHistory.hideIntermediaryHops';
  let hideIntermediaryHops = $state(
    browser ? localStorage.getItem(HIDE_HOPS_KEY) !== 'false' : true
  );

  function toggleHideHops() {
    hideIntermediaryHops = !hideIntermediaryHops;
    if (browser) {
      localStorage.setItem(HIDE_HOPS_KEY, hideIntermediaryHops.toString());
    }
  }

  // Create a filtered store for GenericList
  const filteredStore = writable({
    data: [] as typeof $groupedTransactionHistory.data,
    next: $groupedTransactionHistory.next,
    ended: $groupedTransactionHistory.ended,
  });

  // Update filtered store when source or filter changes
  // Hide transactions where user was just an intermediary hop (net amount < 0.01)
  // Uses isIntermediary flag which is more reliable than type detection
  $effect(() => {
    const sourceData = $groupedTransactionHistory.data;
    const filtered = hideIntermediaryHops
      ? sourceData.filter(tx => !tx.isIntermediary)
      : sourceData;

    filteredStore.set({
      data: filtered,
      next: $groupedTransactionHistory.next,
      ended: $groupedTransactionHistory.ended,
    });
  });

  // Count hidden transactions for UI feedback
  const hiddenCount = $derived(
    $groupedTransactionHistory.data.filter(tx => tx.isIntermediary).length
  );

  function toggleLegend() {
    showLegend = !showLegend;
    if (browser) {
      localStorage.setItem(LEGEND_STORAGE_KEY, showLegend.toString());
    }
  }

  // Check if highlighted tx exists in current data
  const highlightedTxFound = $derived(
    !highlightTx ||
    $groupedTransactionHistory.data.some(
      tx => tx.transactionHash.toLowerCase() === highlightTx?.toLowerCase()
    )
  );

  // Auto-load more pages until highlighted tx is found
  $effect(() => {
    if (
      highlightTx &&
      !highlightedTxFound &&
      !$groupedTransactionHistory.isLoading &&
      !$groupedTransactionHistory.ended &&
      searchAttempts < MAX_SEARCH_PAGES
    ) {
      isSearchingForTx = true;
      searchAttempts++;
      console.log(`[TxPanel] Searching for tx ${highlightTx.slice(0, 10)}... (page ${searchAttempts})`);
      $groupedTransactionHistory.next();
    } else if (highlightedTxFound && isSearchingForTx) {
      console.log(`[TxPanel] Found highlighted tx after ${searchAttempts} pages`);
      isSearchingForTx = false;
    } else if (searchAttempts >= MAX_SEARCH_PAGES && !highlightedTxFound) {
      console.log(`[TxPanel] Tx not found after ${MAX_SEARCH_PAGES} pages, stopping search`);
      isSearchingForTx = false;
    }
  });
</script>

<!-- Filter toggle -->
<div class="flex items-center justify-between mb-2 px-1">
  <label class="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      class="checkbox checkbox-xs checkbox-primary"
      checked={hideIntermediaryHops}
      onchange={toggleHideHops}
    />
    <span class="text-sm text-base-content/70">
      Hide pass-through hops
      {#if hiddenCount > 0 && hideIntermediaryHops}
        <span class="text-base-content/50">({hiddenCount} hidden)</span>
      {/if}
    </span>
  </label>
</div>

<!-- Collapsible Legend -->
<div class="border border-base-300 rounded-lg mb-3 bg-base-100">
  <button
    class="w-full flex items-center justify-between px-3 py-2 text-sm text-base-content/70 hover:text-base-content transition-colors"
    onclick={toggleLegend}
    aria-expanded={showLegend}
  >
    <span>What do the badges mean?</span>
    <Lucide
      icon={showLegend ? LChevronUp : LChevronDown}
      size={16}
      class="stroke-current"
    />
  </button>

  {#if showLegend}
    <div class="px-3 pb-3 pt-2 border-t border-base-300">
      <div class="grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs">
        <div class="flex items-center gap-1.5">
          <img src="/badge-received.svg" alt="" class="w-4 h-4" />
          <span class="text-base-content/80">Received / Minted</span>
        </div>
        <div class="flex items-center gap-1.5">
          <img src="/badge-sent.svg" alt="" class="w-4 h-4" />
          <span class="text-base-content/80">Sent</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-4 h-4 rounded-full bg-error/15 flex items-center justify-center">
            <Lucide icon={Flame} size={10} class="text-error" strokeWidth={2} />
          </div>
          <span class="text-base-content/80">Burned</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-4 h-4 rounded-full bg-gradient-to-br from-error/15 to-success/15 flex items-center justify-center">
            <Lucide icon={RefreshCw} size={10} class="text-base-content/70" />
          </div>
          <span class="text-base-content/80">Conversion</span>
        </div>
        <div class="flex items-center gap-1.5 col-span-2">
          <div class="w-4 h-4 rounded-full bg-base-300/50 flex items-center justify-center">
            <Lucide icon={ArrowLeftRight} size={10} class="text-base-content/50" />
          </div>
          <span class="text-base-content/80">Pass-through (trust path used)</span>
        </div>
      </div>
      <p class="text-[11px] text-base-content/50 mt-1.5">
        Click row to expand. Pass-throughs show routed amount.
      </p>
    </div>
  {/if}
</div>

<GenericList
  row={GroupedTransactionRow}
  store={filteredStore}
  rowProps={{ highlightTx }}
  isInitialLoading={$groupedTransactionHistory.isLoading || isSearchingForTx}
/>
