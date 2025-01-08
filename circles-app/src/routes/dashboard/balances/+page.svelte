<script lang="ts">
  import { circlesBalances } from '$lib/stores/circlesBalances';
  import { totalCirclesBalance } from '$lib/stores/totalCirclesBalance';
  import BalanceRow from '$lib/components/BalanceRow.svelte';
  import { roundToDecimals } from '$lib/utils/shared';
</script>

<div class="flex flex-col items-center p-4 w-full max-w-2xl gap-y-6 mt-20">
  <div class="w-full">
    <a href="/dashboard">
      <img src="/arrow-left.svg" alt="Arrow Left" class="w-4 h-4" />
    </a>
  </div>
  <div
    class="w-full flex flex-col md:flex-row justify-between md:items-end font-bold text-2xl mb-4 gap-y-1"
  >
    Balance breakdown<span
      class="text-sm font-medium text-gray-500 mr-0 md:mr-8"
      >{roundToDecimals($totalCirclesBalance)} CRC</span
    >
  </div>
  <div
    class="w-full md:border rounded-lg md:px-4 md:py-2 flex flex-col divide-y gap-y-2 overflow-x-auto"
  >
    {#each $circlesBalances.data as balance}
      <BalanceRow {balance} />
    {/each}
  </div>
</div>
