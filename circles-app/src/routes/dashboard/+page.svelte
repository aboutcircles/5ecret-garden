<script lang="ts">
  import type { EventRow } from '@circles-sdk/data';
  import GenericList from '$lib/components/GenericList.svelte';
  import { createTransactionHistory } from '$lib/stores/transactionHistory';
  import type { Readable } from 'svelte/store';
  import TransactionRow from './TransactionRow.svelte';
  import TotalBalance from '$lib/components/TotalBalance.svelte';
  import { avatar } from '$lib/stores/avatar';
  import { roundToDecimals } from '$lib/utils/shared';
  import { runTask } from '$lib/utils/tasks';

  let txHistory: Readable<{
    data: EventRow[];
    next: () => Promise<boolean>;
    ended: boolean;
  }>;
  let mintableAmount: number = 0;

  async function init() {
    txHistory = await createTransactionHistory();
    mintableAmount = (await $avatar?.getMintableAmount()) ?? 0;
  }

  $: {
    if ($avatar) {
      init();
    }
  }

  async function mintPersonalCircles() {
    if (!$avatar) {
      throw new Error('Avatar store is not available');
    }

    runTask({
      name: 'Minting Circles ...',
      promise: $avatar.personalMint(),
    }).finally(async () => {
      mintableAmount = (await $avatar?.getMintableAmount()) ?? 0;
    });

    mintableAmount = 0;
  }
</script>

<div class="flex flex-col items-center p-4 w-full max-w-2xl gap-y-6 mt-20">
  <TotalBalance />

  {#if mintableAmount >= 0.01}
    <button class="btn btn-sm btn-primary" on:click={mintPersonalCircles}
      >Mint {roundToDecimals(mintableAmount)} Circles
    </button>
  {/if}
  <div class="w-full md:border rounded-lg md:px-4">
    <GenericList row={TransactionRow} store={txHistory} />
  </div>
</div>
