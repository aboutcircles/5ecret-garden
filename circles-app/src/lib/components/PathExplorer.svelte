<script lang="ts">
  import { get, writable } from 'svelte/store';
  import { shortenAddress } from '$lib/utils/shared';
  import { ethers } from 'ethers'; // Import ethers.js for wei to eth conversion
  import type { TransferPathStep } from '@circles-sdk/sdk/dist/v2/pathfinderV2';
  import Avatar from './avatar/Avatar.svelte';

  export let graph: TransferPathStep[] = [];
  export let startNode = ''; // The starting node of the graph

  // Stores to track current breadcrumbs and edges
  const breadcrumbs = writable([{ node: startNode, label: 'Source' }]);
  const currentEdges = writable(
    graph.filter((edge) => edge.from === startNode)
  );

  // Convert wei to eth for display purposes
  function formatEth(wei: any) {
    return ethers.formatEther(wei);
  }

  // Move to the selected node and update the breadcrumb
  function moveToNode(target: any) {
    const targetEdges = graph.filter((edge) => edge.from === target);
    if (targetEdges.length > 0) {
      breadcrumbs.update((bc) => [
        ...bc,
        { node: target, label: shortenAddress(target) },
      ]);
      currentEdges.set(targetEdges);
    }
  }

  // Navigate back in the breadcrumb to a previous node
  function navigateBackTo(index: number) {
    breadcrumbs.update((bc) => bc.slice(0, index + 1));
    const previousNode = get(breadcrumbs)[index].node;
    const targetEdges = graph.filter((edge) => edge.from === previousNode);
    currentEdges.set(targetEdges);
  }

  // Check if a node has further outgoing edges
  function hasNextEdges(node: any) {
    return graph.some((edge) => edge.from === node);
  }
</script>

<!-- Breadcrumb Navigation -->
{#if $breadcrumbs.length > 1}
  <div class="breadcrumbs">
    {#each $breadcrumbs as crumb, index}
      <button
        on:click={() => navigateBackTo(index)}
        class="btn btn-link text-blue-500"
      >
        {crumb.label}
      </button>
      {#if index < $breadcrumbs.length - 1}
        <span> -&gt; </span>
      {/if}
    {/each}
  </div>
{/if}

<!-- Edge List -->
<div>
  {#each $currentEdges as edge}
    <button
      type="button"
      class="flex w-full items-center justify-between p-2 bg-base-100 hover:bg-base-200 rounded-lg cursor-pointer"
      on:click={() => moveToNode(edge.to)}
      aria-label="Move to node"
    >
      <Avatar address={edge.tokenOwner} clickable={false} view="horizontal">
        To: {shortenAddress(edge.to)}
      </Avatar>
      <div class="flex items-center gap-2">
        <div class="font-medium">
          {parseFloat(formatEth(edge.value)).toFixed(2)} Circles
        </div>
        {#if hasNextEdges(edge.to)}
          <img src="/chevron-right.svg" alt="Chevron Right" class="w-4" />
        {/if}
      </div>
    </button>
  {/each}

  {#if $currentEdges.length === 0}
    <div class="text-center">
      <p>No further edges from this node.</p>
    </div>
  {/if}
</div>
