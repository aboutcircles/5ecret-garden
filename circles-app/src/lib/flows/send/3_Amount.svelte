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
  let showUnusedBalances = writable(false); // Track whether unused balances are visible
  let showPathsSection = false;
  let maxAmountCircles = -1;

  onMount(async () => {
    if (
      !$circles ||
      !$avatar ||
      !context.selectedAddress ||
      $avatar?.avatarInfo?.version !== 2 ||
      context.selectedAsset?.tokenAddress !== TransitiveTransferTokenAddress
    ) {
      maxAmountCircles = -2;
      showPathsSection = false;
      return;
    }

    showPathsSection = true;

    try {
      path =
        (await $circles.v2Pathfinder?.getPath(
          $avatar.address,
          context.selectedAddress,
          '99999999999999999999999999999999999'
        )) ?? [];

      maxAmountCircles = parseFloat(ethers.formatEther(path.maxFlow));

      const balances = await $avatar.getBalances();

      // Get the source edges of the path
      const sourceEdges = path.transfers.filter(
        (edge) => edge.from === $avatar.address
      );

      // Find all balances that are not part of the source edges
      deadBalances = balances.filter(
        (balance) =>
          !sourceEdges.some((edge) => edge.tokenOwner === balance.tokenAddress)
      );
    } catch (e) {
      console.error('Error fetching path:', e);
      maxAmountCircles = -2;
    }
  });

  function handleSelect(event: CustomEvent<{ amount: number }>) {
    context.amount = event.detail.amount;
    console.log('Selected amount:', context.amount);

    popupControls.open({
      title: 'Send',
      component: Send,
      props: {
        context: context,
      },
    });
  }

  // Toggle the visibility of unused balances
  function toggleUnusedBalances() {
    showUnusedBalances.update((value) => !value);
  }
</script>

<FlowDecoration>
  <p class="text-2xl font-bold">Enter Amount</p>
  <SelectAmount
    {maxAmountCircles}
    asset={context.selectedAsset}
    amount={context.amount}
    on:select={handleSelect}
  />

  <div class="flex flex-col mt-4">
    {#if showPathsSection && path}
      <div class="text-gray-500">
        <h2 class="text-lg font-bold">Usable paths:</h2>
      </div>

      {#if path?.transfers?.length > 0}
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
      <div class="mt-4 mb-4 text-gray-500">
        <h2 class="text-lg font-bold flex justify-between items-center">
          Unused balances:
          <button
            on:click={toggleUnusedBalances}
            class="btn btn-sm btn-outline"
          >
            {#if $showUnusedBalances}
              Hide
            {:else}
              Show
            {/if}
          </button>
        </h2>
      </div>

      {#if $showUnusedBalances}
        {#if path?.transfers?.length > 0}
          {#each deadBalances as balance}
            <BalanceRow {balance} />
          {/each}
        {:else}
          <div class="p-4 text-center text-gray-500">
            <div class="spinner spinner-circle spinner-4xl"></div>
          </div>
        {/if}
      {/if}
    {/if}
  </div>
</FlowDecoration>
