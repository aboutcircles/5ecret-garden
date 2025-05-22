<script lang="ts">
  import { circlesBalances } from '$lib/stores/circlesBalances';
  import { totalCirclesBalance } from '$lib/stores/totalCirclesBalance';
  import BalanceRow from '$lib/components/BalanceRow.svelte';
  import { roundToDecimals } from '$lib/utils/shared';
  import { derived, writable } from 'svelte/store';
  import Filter from '$lib/components/Filter.svelte';

  let filterVersion = writable<number | undefined>(undefined);
  let filterType = writable<'personal' | 'group' | undefined>(undefined);
  let filterToken = writable<'erc20' | 'erc1155' | undefined>(undefined);

  let filteredStore = derived(
    [circlesBalances, filterVersion, filterType, filterToken],
    ([$circlesBalances, filterVersion, filterType, filterToken]) => {
      const filteredData = Object.entries($circlesBalances.data).filter(
      ([_, balance]) => {
        const byVersion =
          filterVersion === undefined ||
          balance.version === filterVersion;

        const byType =
          filterType === undefined ||
          (filterType === 'personal'
            ? !balance.isGroup
            : filterType === 'group'
            ? balance.isGroup
            : true);

        const byToken =
          filterToken === undefined ||
          (filterToken === 'erc20'
            ? balance.isErc20
            : filterToken === 'erc1155'
            ? balance.isErc1155
            : true);

        return byVersion && byType && byToken;
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

<div class="flex flex-col items-center w-full max-w-2xl gap-y-4 mt-20">
  <div class="w-full">
    <button onclick={() => history.back()}>
      <img src="/arrow-left.svg" alt="Arrow Left" class="w-4 h-4" />
    </button>
  </div>
  <div
    class="w-full flex flex-col md:flex-row justify-between md:items-end font-bold text-2xl mb-4 gap-y-1"
  >
    Balance breakdown<span
      class="text-sm font-medium text-gray-500 mr-0 md:mr-8"
      >{roundToDecimals($totalCirclesBalance)} CRC</span
    >
  </div>

  <!-- Filter -->
  <div class="flex gap-x-2 items-center w-full">
    <p class="text-sm">Version</p>
    <Filter text="All" filter={filterVersion} value={undefined} />
    <Filter text="Version 1" filter={filterVersion} value={1} />
    <Filter text="Version 2" filter={filterVersion} value={2} />
  </div>
  <div class="flex gap-x-2 items-center w-full">
    <p class="text-sm">Type</p>
    <Filter text="All" filter={filterType} value={undefined} />
    <Filter text="Personal" filter={filterType} value={'personal'} />
    <Filter text="Group" filter={filterType} value={'group'} />
  </div>
  <div class="flex gap-x-2 items-center w-full">
    <p class="text-sm">Token</p>
    <Filter text="All" filter={filterToken} value={undefined} />
    <Filter text="ERC20" filter={filterToken} value={'erc20'} />
    <Filter text="ERC1155" filter={filterToken} value={'erc1155'} />
  </div>
  <div
    class="w-full md:border rounded-lg md:px-4 flex flex-col divide-y gap-y-2 py-4 overflow-y-visible mb-28"
  >
    {#each $filteredStore.data as [, balance]}
      <BalanceRow {balance} />
    {/each}
  </div>
</div>
