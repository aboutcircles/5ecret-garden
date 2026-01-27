<script lang="ts">
  import GenericList from '$lib/components/GenericList.svelte';
  import GroupedTransactionRow from './GroupedTransactionRow.svelte';
  import { groupedTransactionHistory } from '$lib/stores/transactionHistory';
  import { Info as LInfo } from 'lucide';
  import Lucide from '$lib/icons/Lucide.svelte';

  interface Props {
    /** Transaction hash to highlight (from URL deep-link) */
    highlightTx?: string;
  }

  let { highlightTx }: Props = $props();

  // Track if we're searching for the highlighted tx
  let isSearchingForTx = $state(false);
  let searchAttempts = $state(0);
  const MAX_SEARCH_PAGES = 10; // Don't load more than 10 extra pages

  // Legend visibility
  let showLegend = $state(false);

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

<!-- Legend toggle -->
<div class="flex justify-end mb-2">
  <button
    class="btn btn-ghost btn-xs gap-1 text-base-content/60"
    onclick={() => showLegend = !showLegend}
    aria-expanded={showLegend}
  >
    <Lucide icon={LInfo} size={14} class="stroke-current" />
    <span class="text-xs">{showLegend ? 'Hide' : 'Legend'}</span>
  </button>
</div>

{#if showLegend}
  <div class="bg-base-200 rounded-lg p-3 mb-3 text-sm">
    <div class="grid grid-cols-2 gap-2">
      <div class="flex items-center gap-2">
        <img src="/badge-received.svg" alt="" class="w-5 h-5" />
        <span class="text-base-content/80">Received CRC</span>
      </div>
      <div class="flex items-center gap-2">
        <img src="/badge-sent.svg" alt="" class="w-5 h-5" />
        <span class="text-base-content/80">Sent CRC</span>
      </div>
      <div class="flex items-center gap-2">
        <img src="/badge-mint.svg" alt="" class="w-5 h-5" />
        <span class="text-base-content/80">Minted (created)</span>
      </div>
      <div class="flex items-center gap-2">
        <img src="/badge-burn.svg" alt="" class="w-5 h-5" />
        <span class="text-base-content/80">Burned (destroyed)</span>
      </div>
    </div>
    <p class="text-xs text-base-content/60 mt-2">
      Amount shown is your net gain/loss. Click a transaction to see individual transfers.
    </p>
  </div>
{/if}

<GenericList
  row={GroupedTransactionRow}
  store={groupedTransactionHistory}
  rowProps={{ highlightTx }}
  isInitialLoading={$groupedTransactionHistory.isLoading || isSearchingForTx}
/>
