<script lang="ts">
  import { circlesBalances } from '$lib/stores/circlesBalances';
  import { totalCirclesBalance } from '$lib/stores/totalCirclesBalance';
  import BalanceRow from '$lib/components/BalanceRow.svelte';
  import { roundToDecimals } from '$lib/utils/shared';
  import Filter from '$lib/components/Filter.svelte';

  let filterVersion = $state<number | undefined>();
  let filterType = $state<'personal' | 'group' | undefined>();
  let filterToken = $state<'erc20' | 'erc1155' | undefined>();

  let filtered = $derived.by(() => {
    const allBalances = $circlesBalances.data;

    const filteredData = Object.entries(allBalances).filter(([_, balance]) => {
      const byVersion =
        filterVersion === undefined || balance.version === filterVersion;

      const byType =
        filterType === undefined ||
        (filterType === 'personal' ? !balance.isGroup : balance.isGroup);

      const byToken =
        filterToken === undefined ||
        (filterToken === 'erc20' ? balance.isErc20 : balance.isErc1155);

      return byVersion && byType && byToken;
    });

    return {
      data: filteredData,
      next: $circlesBalances.next,
      ended: $circlesBalances.ended,
    };
  });
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
    <Filter
      text="All"
      filter={filterVersion}
      value={undefined}
      set={(v) => (filterVersion = v)}
    />
    <Filter
      text="Version 1"
      filter={filterVersion}
      value={1}
      set={(v) => (filterVersion = v)}
    />
    <Filter
      text="Version 2"
      filter={filterVersion}
      value={2}
      set={(v) => (filterVersion = v)}
    />
  </div>
  <div class="flex gap-x-2 items-center w-full">
    <p class="text-sm">Type</p>
    <Filter
      text="All"
      filter={filterType}
      value={undefined}
      set={(v) => (filterType = v)}
    />
    <Filter
      text="Personal"
      filter={filterType}
      value={'personal'}
      set={(v) => (filterType = v)}
    />
    <Filter
      text="Group"
      filter={filterType}
      value={'group'}
      set={(v) => (filterType = v)}
    />
  </div>
  <div class="flex gap-x-2 items-center w-full">
    <p class="text-sm">Token</p>
    <Filter
      text="All"
      filter={filterToken}
      value={undefined}
      set={(v) => (filterToken = v)}
    />
    <Filter
      text="ERC20"
      filter={filterToken}
      value={'erc20'}
      set={(v) => (filterToken = v)}
    />
    <Filter
      text="ERC1155"
      filter={filterToken}
      value={'erc1155'}
      set={(v) => (filterToken = v)}
    />
  </div>
  <div
    class="w-full md:border rounded-lg md:px-4 flex flex-col divide-y gap-y-2 py-4 overflow-y-visible mb-28"
  >
    {#each filtered.data as [, balance]}
      <BalanceRow {balance} />
    {/each}
  </div>
</div>
