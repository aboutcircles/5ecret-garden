<script lang="ts">
  import { circlesBalances } from '$lib/shared/state/circlesBalances';
  import { derived, writable, type Writable } from 'svelte/store';
  import BalanceRow from '$lib/areas/wallet/ui/components/BalanceRow.svelte';
  import type { EventRow, Address } from '@aboutcircles/sdk-types';
  import Filter from '$lib/shared/ui/primitives/Filter.svelte';
  import GenericList from '$lib/shared/ui/lists/GenericList.svelte';
  import { getGroupName } from '$lib/shared/state/groupNameCache';

  /**
   * Check if a token is a "group token" - either:
   * 1. tokenType is CrcV2_RegisterGroup (isGroup = true)
   * 2. tokenOwner is a known group (ERC20 wrapper of a group token)
   */
  function isGroupToken(balance: { isGroup: boolean; tokenOwner: Address }): boolean {
    if (balance.isGroup) return true;
    const groupName = getGroupName(balance.tokenOwner);
    return !!groupName;
  }

  let filterType = writable<'personal' | 'group' | undefined>(undefined);
  let filterToken = writable<'erc20' | 'erc1155' | undefined>(undefined);
  let showDust = writable<boolean>(false);

  const DUST_THRESHOLD = 10_000_000_000_000_000n; // 0.01 CRC

  // Filters panel state — store to ensure reactivity in all modes
  const showFilters: Writable<boolean> = writable(false);
  const FILTER_PANEL_ID: string = 'balance-filters';

  function toggleFilters(): void {
    showFilters.update((v) => !v);
  }

  // Shape this like other lists so GenericList can key rows
  let filteredStore = derived(
    [circlesBalances, filterType, filterToken, showDust],
    ([$circlesBalances, filterType, filterToken, $showDust]) => {
      const filteredData = Object.values($circlesBalances.data)
        .filter((balance) => {
          const isGroup = isGroupToken(balance);
          const matchesType =
            filterType === undefined ||
            (filterType === 'personal'
              ? !isGroup
              : filterType === 'group'
                ? isGroup
                : true);
          const matchesToken =
            filterToken === undefined ||
            (filterToken === 'erc20'
              ? balance.isErc20
              : filterToken === 'erc1155'
                ? balance.isErc1155
                : true);
          const isNotDust = $showDust || BigInt(balance.attoCircles) >= DUST_THRESHOLD;

          return matchesType && matchesToken && isNotDust;
        })
        .map(
          (balance, i) =>
            ({
              blockNumber: i,
              transactionIndex: i,
              logIndex: i,
              ...balance,
            }) as EventRow
        );

      return {
        data: filteredData,
        next: $circlesBalances.next,
        ended: $circlesBalances.ended,
      };
    }
  );

  // Count of dust tokens hidden by the filter (shown when toggle is off)
  let dustCount = derived(
    [circlesBalances, filterType, filterToken],
    ([$circlesBalances, filterType, filterToken]) => {
      return Object.values($circlesBalances.data).filter((balance) => {
        const isGroup = isGroupToken(balance);
        const matchesType =
          filterType === undefined ||
          (filterType === 'personal' ? !isGroup : filterType === 'group' ? isGroup : true);
        const matchesToken =
          filterToken === undefined ||
          (filterToken === 'erc20' ? balance.isErc20 : filterToken === 'erc1155' ? balance.isErc1155 : true);
        const isDust = BigInt(balance.attoCircles) < DUST_THRESHOLD && BigInt(balance.attoCircles) > 0n;
        return matchesType && matchesToken && isDust;
      }).length;
    }
  );
</script>

<div class="w-full flex items-start gap-2">
  <div class="w-full flex items-center gap-2">
    <button
      type="button"
      class="btn btn-ghost btn-xs p-1 self-start"
      aria-label={$showFilters ? 'Hide filters' : 'Show filters'}
      aria-expanded={$showFilters}
      aria-controls={FILTER_PANEL_ID}
      onclick={toggleFilters}
      title="Filter"
    >
      <!-- funnel icon -->
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M3 4h18v2l-7 7v5l-4 2v-7L3 6V4z"></path>
      </svg>
    </button>
  </div>
</div>

{#if $showFilters}
  <div id={FILTER_PANEL_ID} class="mt-3 space-y-3">
    <div class="flex flex-wrap items-center gap-2">
      <p class="text-sm">Type</p>
      <Filter text="All" filter={filterType} value={undefined} />
      <Filter text="Personal" filter={filterType} value={'personal'} />
      <Filter text="Group" filter={filterType} value={'group'} />
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <p class="text-sm">Token</p>
      <Filter text="All" filter={filterToken} value={undefined} />
      <Filter text="ERC20" filter={filterToken} value={'erc20'} />
      <Filter text="ERC1155" filter={filterToken} value={'erc1155'} />
    </div>

    <label class="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        class="checkbox checkbox-xs"
        checked={$showDust}
        onchange={() => showDust.update(v => !v)}
      />
      <span class="text-sm">
        Show tiny balances (&lt; 0.01 CRC)
        {#if !$showDust && $dustCount > 0}
          <span class="text-base-content/50">({$dustCount} hidden)</span>
        {/if}
      </span>
    </label>
  </div>
{/if}

<GenericList store={filteredStore} row={BalanceRow} />
