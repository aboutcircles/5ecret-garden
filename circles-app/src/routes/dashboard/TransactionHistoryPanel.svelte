<script lang="ts">
  import GenericList from '$lib/components/GenericList.svelte';
  import GroupedTransactionRow from './GroupedTransactionRow.svelte';
  import { groupedTransactionHistory } from '$lib/stores/transactionHistory';
  import { ChevronDown as LChevronDown, ChevronUp as LChevronUp } from 'lucide';
  import Lucide from '$lib/icons/Lucide.svelte';
  import { browser } from '$app/environment';

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
      <div class="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
        <div class="flex items-center gap-2">
          <img src="/badge-received.svg" alt="" class="w-5 h-5" />
          <span class="text-base-content/80">Received</span>
        </div>
        <div class="flex items-center gap-2">
          <img src="/badge-sent.svg" alt="" class="w-5 h-5" />
          <span class="text-base-content/80">Sent</span>
        </div>
        <div class="flex items-center gap-2">
          <img src="/badge-mint.svg" alt="" class="w-5 h-5" />
          <span class="text-base-content/80">Minted</span>
        </div>
        <div class="flex items-center gap-2">
          <img src="/badge-burn.svg" alt="" class="w-5 h-5" />
          <span class="text-base-content/80">Burned</span>
        </div>
      </div>
      <p class="text-xs text-base-content/50 mt-2">
        Amounts show your net gain/loss. Click a row to see all transfers.
      </p>
    </div>
  {/if}
</div>

<GenericList
  row={GroupedTransactionRow}
  store={groupedTransactionHistory}
  rowProps={{ highlightTx }}
  isInitialLoading={$groupedTransactionHistory.isLoading || isSearchingForTx}
/>
