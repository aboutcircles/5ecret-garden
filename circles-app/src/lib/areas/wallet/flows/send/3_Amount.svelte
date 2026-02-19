<script lang="ts">
  import type { SendFlowContext } from '$lib/areas/wallet/flows/send/context';
  import SelectAmount from '$lib/areas/wallet/ui/pages/SelectAmount.svelte';
  import Send from './4_Send.svelte';
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import { onMount, tick } from 'svelte';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { TransitiveTransferTokenAddress } from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
  import { ethers } from 'ethers';
  import { popupControls } from '$lib/shared/state/popup/popUp.svelte';

  interface Props {
    context: SendFlowContext;
  }

  let { context }: Props = $props();

  if (context.amount === undefined) {
    context.amount = 0;
  }

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
      !avatarState.avatar ||
      !context.selectedAddress
    ) {
      return;
    }

    // Start loading
    calculatingPath = true;

    try {
      // Use new SDK's transfer.getMaxAmount method
      const maxAmountAttoCrc = await avatarState.avatar.transfer.getMaxAmount(
        context.selectedAddress
      );

      if (!maxAmountAttoCrc || maxAmountAttoCrc === 0n) {
        pathfindingFailed = true;
        maxAmountCircles = 0;
        return;
      }

      // Convert atto-circles to CRC for display
      maxAmountCircles = parseFloat(ethers.formatEther(maxAmountAttoCrc));

      // Pathfinding succeeded
      showPathsSection = true;

      console.log('Pathfinding complete:', {
        maxAmountCrc: maxAmountCircles,
        maxAmountAttoCrc: maxAmountAttoCrc.toString(),
      });

      // Note: The new SDK handles path calculation internally in transfer.advanced()
      // We don't need to manually fetch the path here anymore
    } catch (err) {
      console.error('Error calculating max transferable amount:', err);
      pathfindingFailed = true;
      maxAmountCircles = -2;
    } finally {
      // End loading
      calculatingPath = false;
    }
  });

  async function handleSelect() {
    // Ensure all two-way bindings from CurrencyInput → SelectAmount → context are flushed
    await tick();

    // Normalize to a number (defensive)
    context.amount = Number(context.amount ?? 0);

    popupControls.open({
      title: 'Send',
      component: Send,
      props: { context },
    });
  }

  function toggleDataInput() {
    showDataInput = !showDataInput;
  }
</script>

<FlowDecoration>
  <!-- Always show the amount selection -->
  <SelectAmount
    maxAmountCircles={context.selectedAsset.isErc20
      ? context.selectedAsset.staticCircles
      : maxAmountCircles}
    asset={context.selectedAsset}
    bind:amount={context.amount}
  />

  <!-- Loading indicator while pathfinding is in progress -->
  {#if calculatingPath}
    <div class="flex items-center mt-4 space-x-2">
      <span class="loading loading-spinner"></span>
      <p class="text-base-content/70">Calculating path…</p>
    </div>
  {:else}
    <!-- Show a short message if pathfinding actually failed -->
    {#if pathfindingFailed}
      <div class="mt-4 p-2 text-error">
        <p>Pathfinding failed. No usable path was found.</p>
      </div>
    {:else}
      <!-- Attach data + Continue -->
      <div
        class="mt-6 flex flex-col md:flex-row justify-end items-stretch md:items-center gap-2"
      >
        {#if avatarState.avatar?.avatarInfo?.version === 2 && !context.selectedAsset.isErc20}
          <button
            type="button"
            class="btn btn-outline w-full md:w-auto rounded-md"
            onclick={toggleDataInput}
          >
            Attach data
          </button>
        {/if}
        <button
          type="button"
          class="btn btn-primary w-full md:w-auto rounded-md text-white"
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
</FlowDecoration>
