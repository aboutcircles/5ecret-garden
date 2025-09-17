<script lang="ts">
    import {circlesBalances} from '$lib/stores/circlesBalances';
    import {totalCirclesBalance} from '$lib/stores/totalCirclesBalance';
    import {roundToDecimals} from '$lib/utils/shared';
    import {derived, writable, type Writable} from 'svelte/store';
    import Filter from '$lib/components/Filter.svelte';
    import GenericList from '$lib/components/GenericList.svelte';
    import BalanceRow from '$lib/components/BalanceRow.svelte';
    import type {EventRow} from '../../../../../circles-sdk/packages/data/src';

    let filterVersion = writable<number | undefined>(undefined);
    let filterType = writable<'personal' | 'group' | undefined>(undefined);
    let filterToken = writable<'erc20' | 'erc1155' | undefined>(undefined);

    // Filters panel state — store to ensure reactivity in all modes
    const showFilters: Writable<boolean> = writable(false);
    const FILTER_PANEL_ID: string = 'balance-filters';

    function toggleFilters(): void {
        showFilters.update((v) => !v);
    }

    // Shape this like other lists so GenericList can key rows
    let filteredStore = derived(
        [circlesBalances, filterVersion, filterType, filterToken],
        ([$circlesBalances, filterVersion, filterType, filterToken]) => {
            const filteredData = Object
                .values($circlesBalances.data)
                .filter((balance) => {
                    const matchesVersion = filterVersion === undefined || balance.version === filterVersion;
                    const matchesType =
                        filterType === undefined ||
                        (filterType === 'personal' ? !balance.isGroup :
                            filterType === 'group' ? balance.isGroup : true);
                    const matchesToken =
                        filterToken === undefined ||
                        (filterToken === 'erc20' ? balance.isErc20 :
                            filterToken === 'erc1155' ? balance.isErc1155 : true);
                    const isNotDust = BigInt(balance.attoCircles) >= 10_000_000_000_000_000n;

                    return matchesVersion && matchesType && matchesToken && isNotDust;
                })
                .map((balance, i) => ({
                    blockNumber: i,
                    transactionIndex: i,
                    logIndex: i,
                    ...balance
                } as EventRow));

            return {
                data: filteredData,
                next: $circlesBalances.next,
                ended: $circlesBalances.ended
            };
        }
    );
</script>

<div class="w-full flex items-start gap-2">
    <div class="w-full flex items-center gap-2">
        <h1 class="text-xl font-bold mb-4">Balance breakdown</h1>
        <button
                type="button"
                class="btn btn-ghost btn-xs p-1 self-start"
                aria-label={$showFilters ? 'Hide filters' : 'Show filters'}
                aria-expanded={$showFilters}
                aria-controls={FILTER_PANEL_ID}
                on:click={toggleFilters}
                title="Filter"
        >
            <!-- funnel icon -->
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"
                 aria-hidden="true">
                <path d="M3 4h18v2l-7 7v5l-4 2v-7L3 6V4z"></path>
            </svg>
        </button>
    </div>
</div>

{#if $showFilters}
    <div id={FILTER_PANEL_ID} class="mt-3 space-y-3">
        <div class="flex flex-wrap items-center gap-2">
            <p class="text-sm">Version</p>
            <Filter text="All" filter={filterVersion} value={undefined}/>
            <Filter text="Version 1" filter={filterVersion} value={1}/>
            <Filter text="Version 2" filter={filterVersion} value={2}/>
        </div>

        <div class="flex flex-wrap items-center gap-2">
            <p class="text-sm">Type</p>
            <Filter text="All" filter={filterType} value={undefined}/>
            <Filter text="Personal" filter={filterType} value={'personal'}/>
            <Filter text="Group" filter={filterType} value={'group'}/>
        </div>

        <div class="flex flex-wrap items-center gap-2">
            <p class="text-sm">Token</p>
            <Filter text="All" filter={filterToken} value={undefined}/>
            <Filter text="ERC20" filter={filterToken} value={'erc20'}/>
            <Filter text="ERC1155" filter={filterToken} value={'erc1155'}/>
        </div>
    </div>
{/if}

<GenericList store={filteredStore} row={BalanceRow}/>
