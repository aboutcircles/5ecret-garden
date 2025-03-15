<script lang="ts">
  import type { SendFlowContext } from '$lib/flows/send/context';
  import SelectAmount from '$lib/pages/SelectAmount.svelte';
  import Send from './4_Send.svelte';
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import { onMount } from 'svelte';
  import { circles } from '$lib/stores/circles';
  import { avatar } from '$lib/stores/avatar';
  import { TransitiveTransferTokenAddress } from '$lib/pages/SelectAsset.svelte';
  import type { TokenBalanceRow } from '@circles-sdk/data';
  import PathExplorer from '$lib/components/PathExplorer.svelte';
  import BalanceRow from '$lib/components/BalanceRow.svelte';
  import { writable } from 'svelte/store';
  import type { MaxFlowResponse } from '@circles-sdk/sdk/dist/v2/pathfinderV2';
  import { ethers } from 'ethers';
  import { popupControls } from '$lib/stores/popUp';

  export let context: SendFlowContext;

  let deadBalances: TokenBalanceRow[] = [];
  let path: MaxFlowResponse;

  let showUnusedBalances = writable(false);
  let showPathsSection = false;     // True if pathfinding succeeds
  let pathfindingFailed = false;    // True if pathfinding fails
  let maxAmountCircles = -1;

  // Show/hide data attachment UI
  let showDataInput = false;

  let isLoadingPathfinding = false; // True while we try to get a path

  // Is this the transitive-transfer token?
  $: usesTTT =
    context.selectedAsset?.tokenAddress === TransitiveTransferTokenAddress;

  // Helper: check if a string is valid hex (allowing optional "0x" prefix)
  function isValidHexString(str: string): boolean {
    let hex = str.trim();
    if (hex.startsWith('0x')) {
      hex = hex.slice(2);
    }
    return /^[0-9A-Fa-f]*$/.test(hex);
  }

  // We only *render* the Continue button if (!usesTTT || showPathsSection) and not loading.
  // Then we also *disable* it if either the amount <= 0, or if dataType=hex and the data is invalid.
  $: canEnableContinue = (() => {
    // Basic checks: amount must be positive
    if (!context.amount || context.amount <= 0) return false;

    // If dataType is hex, user must have a valid hex string (or be empty)
    if (context.dataType === 'hex' && context.data?.trim()) {
      if (!isValidHexString(context.data)) {
        return false;
      }
    }
    return true;
  })();

  onMount(async () => {
    // If there's already data, auto-expand the data area
    if (context.data) {
      showDataInput = true;
    }

    // Default dataType to 'utf-8' if unset
    if (!context.dataType) {
      context.dataType = 'utf-8';
    }

    // If not TTT or missing info, skip pathfinding
    if (
      !usesTTT ||
      !$circles ||
      !$avatar ||
      !context.selectedAddress ||
      $avatar?.avatarInfo?.version !== 2
    ) {
      return;
    }

    isLoadingPathfinding = true;
    try {
      const bigNumber = '99999999999999999999999999999999999';
      path =
        (await $circles.v2Pathfinder?.getPath(
          $avatar.address,
          context.selectedAddress,
          bigNumber
        )) ?? [];

      maxAmountCircles = parseFloat(ethers.formatEther(path.maxFlow));

      // Consider it a failure if maxFlow=0 or no transfers
      if (!path.transfers?.length || maxAmountCircles === 0) {
        pathfindingFailed = true;
        return;
      }

      // Path succeeded
      showPathsSection = true;

      const balances = await $avatar.getBalances();
      const sourceEdges = path.transfers.filter(
        (edge) => edge.from === $avatar.address
      );

      // "Dead" balances not used in the path
      deadBalances = balances.filter(
        (balance) =>
          !sourceEdges.some((edge) => edge.tokenOwner === balance.tokenAddress)
      );
    } catch (err) {
      console.error('Error fetching path:', err);
      pathfindingFailed = true;
      maxAmountCircles = -2;
    } finally {
      isLoadingPathfinding = false;
    }
  });

  function handleSelect() {
    console.log('Selected amount:', context.amount);
    console.log('Attached data:', context.data);
    console.log('Data type:', context.dataType);

    popupControls.open({
      title: 'Send',
      component: Send,
      props: { context }
    });
  }

  function toggleUnusedBalances() {
    showUnusedBalances.update((v) => !v);
  }

  function toggleDataInput() {
    showDataInput = !showDataInput;
  }
</script>

<FlowDecoration>
  <p class="text-2xl font-bold">Enter Amount</p>

  <!-- Always show the amount selection -->
  <SelectAmount
    {maxAmountCircles}
    asset={context.selectedAsset}
    bind:amount={context.amount}
    on:select={handleSelect}
  />

  <!-- While pathfinding is in progress, show a spinner -->
  {#if isLoadingPathfinding}
    <div class="flex items-center mt-4 space-x-2">
      <div class="spinner spinner-circle spinner-4xl"></div>
      <p class="text-gray-500">Calculating path…</p>
    </div>
  {/if}

  <!--
    We'll *render* the Continue button only if:
      - It's not TTT, or TTT + path found
      - Not loading
    We'll also *disable* the button if amount <= 0, or if data is invalid hex.
  -->
  <div class="flex justify-end space-x-2 mt-6">
    <!-- Always possible to attach data -->
    <button
      type="button"
      class="btn btn-outline max-sm:w-full rounded-md mt-8 md:mt-2"
      on:click={toggleDataInput}
    >
      Attach data
    </button>

    <!-- Render if TTT + path found, or not TTT at all -->
    {#if (!usesTTT || showPathsSection) && !isLoadingPathfinding}
      <button
        type="submit"
        class="btn btn-primary max-sm:w-full rounded-md text-white mt-8 md:mt-2"
        on:click={handleSelect}
        disabled={!canEnableContinue}
      >
        Continue
      </button>
    {/if}
  </div>

  <!-- Data input area -->
  {#if showDataInput}
    <div class="mt-4">
      <!-- One line for label + radio group -->
      <div class="flex items-center mb-2">
        <label for="dataInput" class="font-medium mr-4">Data</label>

        <label class="inline-flex items-center space-x-1 mr-4">
          <input
            type="radio"
            name="dataType"
            value="utf-8"
            bind:group={context.dataType}
          />
          <span>UTF-8</span>
        </label>

        <label class="inline-flex items-center space-x-1">
          <input
            type="radio"
            name="dataType"
            value="hex"
            bind:group={context.dataType}
          />
          <span>Hex</span>
        </label>
      </div>

      <!-- Textarea -->
      <textarea
        id="dataInput"
        class="w-full p-2 border rounded-md"
        rows="4"
        placeholder="Enter data here"
        bind:value={context.data}
      />
    </div>
  {/if}

  <!-- If TTT was selected but pathfinding fails, show error (no continue btn) -->
  {#if usesTTT && pathfindingFailed && !isLoadingPathfinding}
    <div class="mt-4 p-2 text-red-600">
      <p>Pathfinding failed. No usable path was found.</p>
    </div>
  {/if}

  <!-- If pathfinding succeeded, display path-based UI -->
  {#if showPathsSection && path && !isLoadingPathfinding}
    <div class="mt-4 text-gray-500">
      <h2 class="text-lg font-bold">Usable paths:</h2>
      {#if path.transfers?.length > 0}
        <PathExplorer
          graph={path.transfers}
          startNode={path.transfers[0].from}
        />
      {:else}
        <div class="p-4 text-center text-gray-500">
          <div class="spinner spinner-circle spinner-4xl"></div>
        </div>
      {/if}

      <!-- Unused Balances Collapsible Section -->
      <div class="mt-4 mb-4">
        <h2 class="text-lg font-bold flex justify-between items-center">
          Unused balances:
          <button on:click={toggleUnusedBalances} class="btn btn-sm btn-outline">
            {#if $showUnusedBalances}
              Hide
            {:else}
              Show
            {/if}
          </button>
        </h2>
      </div>

      {#if $showUnusedBalances}
        {#if path.transfers?.length > 0}
          {#each deadBalances as balance}
            <BalanceRow {balance} />
          {/each}
        {:else}
          <div class="p-4 text-center text-gray-500">
            <div class="spinner spinner-circle spinner-4xl"></div>
          </div>
        {/if}
      {/if}
    </div>
  {/if}
</FlowDecoration>
