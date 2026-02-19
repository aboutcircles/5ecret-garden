<script lang="ts">
  import { circles } from '$lib/shared/state/circles';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { getTrustNetworkSummary } from '$lib/shared/utils/sdkHelpers';
  import type { Address } from '@aboutcircles/sdk-types';
  import type { TrustNetworkSummary } from '$lib/shared/utils/sdkHelpers';
  import { onMount } from 'svelte';

  let summary: TrustNetworkSummary | null = $state(null);
  let loading = $state(true);
  let error: string | null = $state(null);

  onMount(async () => {
    if (!$circles || !avatarState.avatar?.address) {
      loading = false;
      return;
    }

    try {
      summary = await getTrustNetworkSummary(
        $circles,
        avatarState.avatar.address as Address,
        2
      );
    } catch (e) {
      console.error('Failed to load trust network summary:', e);
      error = e instanceof Error ? e.message : 'Failed to load';
    } finally {
      loading = false;
    }
  });
</script>

<div class="bg-white p-6 rounded-xl border shadow-sm">
  <h3 class="text-lg font-semibold text-gray-800 mb-4">Trust Network</h3>

  {#if loading}
    <div class="flex items-center justify-center py-8">
      <span class="loading loading-spinner loading-md"></span>
    </div>
  {:else if error}
    <p class="text-sm text-gray-500">{error}</p>
  {:else if summary}
    <div class="grid grid-cols-2 gap-4">
      <div class="text-center p-3 bg-gray-50 rounded-lg">
        <div class="text-2xl font-bold text-primary">{summary.directTrustsCount}</div>
        <div class="text-xs text-gray-500">You Trust</div>
      </div>

      <div class="text-center p-3 bg-gray-50 rounded-lg">
        <div class="text-2xl font-bold text-primary">{summary.directTrustedByCount}</div>
        <div class="text-xs text-gray-500">Trust You</div>
      </div>

      <div class="text-center p-3 bg-gray-50 rounded-lg">
        <div class="text-2xl font-bold text-secondary">{summary.mutualTrustsCount}</div>
        <div class="text-xs text-gray-500">Mutual</div>
      </div>

      <div class="text-center p-3 bg-gray-50 rounded-lg">
        <div class="text-2xl font-bold text-accent">{summary.networkReach}</div>
        <div class="text-xs text-gray-500">Network Reach</div>
      </div>
    </div>

    {#if summary.mutualTrusts && summary.mutualTrusts.length > 0}
      <div class="mt-4 pt-4 border-t">
        <div class="flex justify-between items-center">
          <span class="text-sm text-gray-600">Mutual trust connections:</span>
          <span class="font-semibold text-primary">{summary.mutualTrusts.length}</span>
        </div>
      </div>
    {/if}
  {:else}
    <p class="text-sm text-gray-500">No trust network data available</p>
  {/if}
</div>
