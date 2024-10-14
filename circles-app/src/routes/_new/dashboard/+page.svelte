<script lang="ts">
  import type { EventRow } from '@circles-sdk/data';
  import GenericList from '$lib/components/GenericList.svelte';
  import { createTransactionHistory } from '$lib/stores/transactionHistory';
  import type { Readable } from 'svelte/store';
  import TransactionRow from './TransactionRow.svelte';
  import TotalBalance from '$lib/components/TotalBalance.svelte';
  import { avatar } from '$lib/stores/avatar';
  import { roundToDecimals } from '$lib/utils/shared';
  import { runTask } from '../../+layout.svelte';

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

<div class="w-[90%] lg:w-3/5 flex flex-col items-center gap-y-3 mt-20">
  <TotalBalance />

  {#if mintableAmount >= 0.01}
    <div
      role="alert"
      class="flex items-center justify-between w-full p-3 border rounded-lg"
    >
      <span class="font-semibold"
        >You can mint {roundToDecimals(mintableAmount)} new Circles.</span
      >
      <div>
        <button class="btn btn-sm btn-primary" on:click={mintPersonalCircles}
          >Mint Circles</button
        >
      </div>
    </div>
  {/if}
  <div class="w-full border rounded-lg p-4">
    <GenericList row={TransactionRow} store={txHistory} />
  </div>
</div>
