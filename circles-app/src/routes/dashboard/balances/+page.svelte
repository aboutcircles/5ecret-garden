<script lang="ts">
  import { circlesBalances } from '$lib/stores/circlesBalances';
  import { totalCirclesBalance } from '$lib/stores/totalCirclesBalance';
  import BalanceRow from '$lib/components/BalanceRow.svelte';
  import { roundToDecimals } from '$lib/utils/shared';
  import { derived, writable } from 'svelte/store';
  import Filter from '$lib/components/Filter.svelte';

  let filter = writable<string | undefined>(undefined);

  let filteredStore = derived(
    [circlesBalances, filter],
    ([$circlesBalances, filter]) => {
      const filteredData = Object.entries($circlesBalances.data).filter(
        ([_, balance]) => {
          if (filter == 'personal') {
            return !filter || !balance.isGroup;
          }
          if (filter == 'group') {
            return !filter || balance.isGroup;
          }
          if (filter == 'erc20') {
            return !filter || balance.isErc20;
          }
          if (filter == 'erc1155') {
            return !filter || balance.isErc1155;
          }
          return true;
        }
      );

      return {
        data: filteredData,
        next: $circlesBalances.next,
        ended: $circlesBalances.ended,
      };
    }
  );
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
  <div class="flex gap-x-2 w-full">
    <Filter text="All" {filter} value={undefined} />
    <Filter text="Personal" {filter} value={'personal'} />
    <Filter text="Group" {filter} value={'group'} />
    <Filter text="ERC20" {filter} value={'erc20'} />
    <Filter text="ERC1155" {filter} value={'erc1155'} />
  </div>
  <div
    class="w-full md:border rounded-lg md:px-4 flex flex-col divide-y gap-y-2 py-4 overflow-y-visible mb-28"
  >
    {#each $filteredStore.data as [, balance]}
      <BalanceRow {balance} />
    {/each}
  </div>
</div>
