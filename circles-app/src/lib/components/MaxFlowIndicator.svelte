<script lang="ts">
  import { circles } from '$lib/stores/circles';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { findMaxFlow } from '$lib/utils/sdkHelpers';
  import type { Address } from '@aboutcircles/sdk-types';
  import { formatEther } from 'ethers';
  import { onMount } from 'svelte';

  interface Props {
    toAddress: Address;
    onMaxCalculated?: (maxAmount: bigint) => void;
  }

  let { toAddress, onMaxCalculated }: Props = $props();

  let maxFlow: bigint | null = $state(null);
  let loading = $state(true);
  let error: string | null = $state(null);

  function formatMax(value: bigint): string {
    const formatted = parseFloat(formatEther(value));
    if (formatted >= 1000) {
      return `${(formatted / 1000).toFixed(1)}k`;
    }
    return formatted.toFixed(2);
  }

  onMount(async () => {
    if (!$circles || !avatarState.avatar?.address) {
      loading = false;
      return;
    }

    try {
      maxFlow = await findMaxFlow(
        $circles,
        avatarState.avatar.address as Address,
        toAddress
      );
      if (onMaxCalculated && maxFlow !== null) {
        onMaxCalculated(maxFlow);
      }
    } catch (e) {
      console.error('Failed to calculate max flow:', e);
      error = e instanceof Error ? e.message : 'Failed';
    } finally {
      loading = false;
    }
  });
</script>

<div class="max-flow-indicator inline-flex items-center gap-2">
  {#if loading}
    <span class="loading loading-spinner loading-xs"></span>
    <span class="text-xs text-gray-500">Calculating max...</span>
  {:else if error}
    <span class="text-xs text-error">Path error</span>
  {:else if maxFlow !== null}
    {#if maxFlow === 0n}
      <span class="badge badge-error badge-sm">No path found</span>
    {:else}
      <span class="badge badge-success badge-sm">
        Max: {formatMax(maxFlow)} CRC
      </span>
    {/if}
  {/if}
</div>
