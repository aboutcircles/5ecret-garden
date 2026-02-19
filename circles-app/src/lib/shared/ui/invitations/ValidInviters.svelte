<script lang="ts">
  import { circles } from '$lib/shared/state/circles';
  import { getValidInviters } from '$lib/shared/utils/sdkHelpers';
  import type { Address } from '@aboutcircles/sdk-types';
  import type { ValidInvitersResponse, InviterInfo } from '$lib/shared/utils/sdkHelpers';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import { formatEther } from 'ethers';
  import { onMount } from 'svelte';

  interface Props {
    address: Address;
    minimumBalance?: string;
    onSelect?: (inviter: InviterInfo) => void;
  }

  let { address, minimumBalance = '10', onSelect }: Props = $props();

  let response: ValidInvitersResponse | null = $state(null);
  let loading = $state(true);
  let error: string | null = $state(null);

  onMount(async () => {
    if (!$circles) {
      loading = false;
      error = 'SDK not initialized';
      return;
    }

    try {
      response = await getValidInviters($circles, address, minimumBalance);
    } catch (e) {
      console.error('Failed to load valid inviters:', e);
      error = e instanceof Error ? e.message : 'Failed to load';
    } finally {
      loading = false;
    }
  });

  function formatBalance(balance: string | bigint): string {
    const val = typeof balance === 'string' ? balance : balance.toString();
    return parseFloat(formatEther(val)).toFixed(2);
  }

  function handleSelect(inviter: InviterInfo) {
    if (onSelect) {
      onSelect(inviter);
    }
  }
</script>

<div class="valid-inviters">
  {#if loading}
    <div class="flex items-center justify-center py-8">
      <span class="loading loading-spinner loading-md"></span>
      <span class="ml-2 text-gray-500">Finding valid inviters...</span>
    </div>
  {:else if error}
    <div class="p-4 text-center text-error">{error}</div>
  {:else if response && response.validInviters.length > 0}
    <div class="mb-3">
      <p class="text-sm text-gray-600">
        {response.validInviters.length} address{response.validInviters.length !== 1 ? 'es' : ''} can invite you
      </p>
    </div>

    <div class="space-y-1">
      {#each response.validInviters as inviter}
        <RowFrame
          clickable={!!onSelect}
          dense={true}
          noLeading={true}
          onclick={() => handleSelect(inviter)}
        >
          <div class="min-w-0 flex-1">
            <Avatar
              address={inviter.address}
              view="horizontal"
              clickable={false}
              bottomInfo={inviter.avatarInfo?.name ?? ''}
            />
          </div>
          {#snippet trailing()}
            <div class="flex items-center gap-2">
              <div class="text-right">
                <div class="text-sm font-medium tabular-nums">
                  {formatBalance(inviter.balance)} CRC
                </div>
                <span class="text-xs text-success">Ready to invite</span>
              </div>
              {#if onSelect}
                <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" />
              {/if}
            </div>
          {/snippet}
        </RowFrame>
      {/each}
    </div>
  {:else}
    <div class="p-6 text-center">
      <p class="text-gray-500">No one can currently invite you</p>
      <p class="text-xs text-gray-400 mt-2">
        Ask someone to trust your address first
      </p>
    </div>
  {/if}
</div>
