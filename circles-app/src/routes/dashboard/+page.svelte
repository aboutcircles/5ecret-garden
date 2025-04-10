<script lang="ts">
  import GenericList from '$lib/components/GenericList.svelte';
  import TransactionRow from './TransactionRow.svelte';
  import TotalBalance from '$lib/components/TotalBalance.svelte';
  import { avatar, isGroup } from '$lib/stores/avatar';
  import { roundToDecimals } from '$lib/utils/shared';
  import { runTask } from '$lib/utils/tasks';
  import { transactionHistory } from '$lib/stores/transactionHistory';

  let mintableAmount: number = $state(0);


  avatar.subscribe(async () => {
    if($avatar && !$isGroup){
      mintableAmount = (await $avatar?.getMintableAmount()) ?? 0;
    }
  });

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

<div class="flex flex-col items-center w-full max-w-2xl gap-y-6 mt-20">
  <TotalBalance />

  {#if mintableAmount >= 0.01}
    <button class="btn btn-sm btn-primary" onclick={mintPersonalCircles}>
      Mint {roundToDecimals(mintableAmount)} Circles
    </button>
  {/if}
  <div class="w-full md:border rounded-lg md:px-4">
    <GenericList row={TransactionRow} store={transactionHistory} />
  </div>
</div>
