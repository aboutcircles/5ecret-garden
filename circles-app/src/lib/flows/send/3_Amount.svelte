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
  import type { MaxFlowResponse } from '@circles-sdk/sdk';
  import { ethers } from 'ethers';
  import { popupControls } from '$lib/stores/popUp';
  import { crcToTc } from '@circles-sdk/utils';

  interface Props {
    context: SendFlowContext;
  }

  let { context = $bindable() }: Props = $props();

  if (context.amount === undefined) {
    context.amount = 0;
  }

  let deadBalances: TokenBalanceRow[] = $state([]);
  let path: MaxFlowResponse | undefined = $state();

  let showUnusedBalances = writable(false);
  let showPathsSection = $state(false); // True if pathfinding succeeds
  let pathfindingFailed = $state(false); // True if pathfinding fails
  let maxAmountCircles = $state(-1);

  // Controls displaying the data interface.
  // We'll override this in onMount if context.data is present.
  let showDataInput = $state(false);

  let calculatingPath = $state(false); // Indicates pathfinding is in progress

  onMount(async () => {
    // If context.data is already set, expand the "Attach data" area by default
    if (context.data) {
      showDataInput = true;
      // If user didn't specify a dataType, default to UTF-8
    }
    if (!context.dataType) {
      context.dataType = 'utf-8';
    }

    // If not transitive transfer or missing info, skip pathfinding
    if (
      context.selectedAsset?.tokenAddress != TransitiveTransferTokenAddress ||
      !$circles ||
      !$avatar ||
      !context.selectedAddress
    ) {
      return;
    }

    // Start loading
    calculatingPath = true;

    try {
      const bigNumber = '99999999999999999999999999999999999';
      const p = $avatar?.avatarInfo?.version === 1
        ? await $circles.v1Pathfinder?.getPath(
          $avatar.address,
          context.selectedAddress,
          bigNumber
        )
        : await $circles.v2Pathfinder?.getPath(
          $avatar.address,
          context.selectedAddress,
          bigNumber,
          true
        );

      if (!p || !p.transfers?.length) {
        pathfindingFailed = true;
        return;
      }

      path = p;

      maxAmountCircles = parseFloat(ethers.formatEther(path.maxFlow.toString()));
      if ($avatar?.avatarInfo?.version === 1) {
        maxAmountCircles = crcToTc(new Date(), BigInt(path.maxFlow));
      }

      // If pathfinding returned maxFlow = 0 or no meaningful transfers, treat as failure
      if (!path.transfers?.length || maxAmountCircles === 0) {
        pathfindingFailed = true;
        return;
      }

      // Otherwise, pathfinding succeeded
      showPathsSection = true;

      const balances = await $avatar.getBalances();
      const sourceEdges = path.transfers.filter(
        (edge) => edge.from === $avatar.address,
      );

      // Identify "dead" balances not used in the path
      deadBalances = balances.filter(
        (balance) =>
          !sourceEdges.some((edge) => edge.tokenOwner === balance.tokenAddress),
      );
    } catch (err) {
      console.error('Error fetching path:', err);
      pathfindingFailed = true;
      maxAmountCircles = -2;
    } finally {
      // End loading
      calculatingPath = false;
    }
  });

  function handleSelect() {
    console.log('Selected amount:', context.amount);
    console.log('Attached data:', context.data);
    console.log('Data type:', context.dataType);

    popupControls.open({
      title: 'Send',
      component: Send,
      props: {
        context,
      },
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
  />

  <!-- Loading indicator while pathfinding is in progress -->
  {#if calculatingPath}
    <div class="flex items-center mt-4 space-x-2">
      <div class="spinner spinner-circle spinner-4xl"></div>
      <p class="text-gray-500">Calculating path…</p>
    </div>
  {:else}
    <!-- Show a short message if pathfinding actually failed -->
    {#if pathfindingFailed}
      <div class="mt-4 p-2 text-red-600">
        <p>Pathfinding failed. No usable path was found.</p>
      </div>
    {:else}
      <!-- Attach data UI -->
      <div class="flex justify-end space-x-2 mt-6">
        {#if $avatar?.avatarInfo?.version === 2 && !context.selectedAsset.isErc20}
          <button
            type="button"
            class="btn btn-outline max-sm:w-full rounded-md mt-8 md:mt-2"
            onclick={toggleDataInput}
          >
            Attach data
          </button>
        {/if}
        <button
          type="submit"
          class="btn btn-primary max-sm:w-full rounded-md text-white mt-8 md:mt-2"
          onclick={handleSelect}
        >
          Continue
        </button>
      </div>
    {/if}
  {/if}

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

      <!-- Textarea on its own line -->
      <textarea
        id="dataInput"
        class="w-full p-2 border rounded-md"
        rows="4"
        placeholder="Enter data here"
        bind:value={context.data}
      ></textarea>
    </div>
  {/if}

  <!-- Condition 3: If pathfinding succeeded, show path-based UI -->
  {#if showPathsSection && path && !calculatingPath}

    <!-- Path UI -->
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
          <button onclick={toggleUnusedBalances} class="btn btn-sm btn-outline">
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
