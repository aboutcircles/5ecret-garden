<script lang="ts">
    import { browser } from '$app/environment';
    import {circlesBalances} from '$lib/shared/state/circlesBalances';
    import {derived, writable, type Writable} from 'svelte/store';
    import { onMount } from 'svelte';
    import BalanceRow from '$lib/areas/wallet/ui/components/BalanceRow.svelte';
    import BalanceRowPlaceholder from '$lib/shared/ui/lists/placeholders/BalanceRowPlaceholder.svelte';
    import type {EventRow} from '@circles-sdk/data';
    import Filter from '$lib/shared/ui/lists/Filter.svelte';
    import GenericList from '$lib/shared/ui/lists/GenericList.svelte';
    import ListShell from '$lib/shared/ui/lists/ListShell.svelte';
    import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
    import { CircleHelp as LCircleHelp, X as LX } from 'lucide';
    import { createListInputArrowDownHandler } from '$lib/shared/ui/lists/utils/listInputArrowDown';
    import { WHY_MANY_CIRCLES_LINES } from '$lib/shared/content/trustRoutingCopy';
    import {
        pickWrappedStaticTokenAddresses,
        type WrappedStaticPriceMap,
    } from '$lib/shared/pricing/wrappedStaticPricing';
    import { setBalancePricingContext } from '$lib/shared/pricing/balancePricingContext';

    let filterVersion = writable<number | undefined>(undefined);
    let filterType = writable<'personal' | 'group' | undefined>(undefined);
    let filterToken = writable<'erc20' | 'erc1155' | undefined>(undefined);
    let searchQuery = writable<string>('');
    let balancesListScopeEl: HTMLDivElement | null = $state(null);

    // Filters panel state — store to ensure reactivity in all modes
    const showFilters: Writable<boolean> = writable(false);
    const FILTER_PANEL_ID: string = 'balance-filters';
    const BALANCES_HELP_DISMISSED_KEY = 'balances-help-dismissed-v1';

    let showBalancesHelp: boolean = $state(false);
    const wrappedStaticPrices = writable<WrappedStaticPriceMap>({});

    setBalancePricingContext({ wrappedStaticPrices });

    function toggleFilters(): void {
        showFilters.update((v) => !v);
    }

    function filterButtonClass(active: boolean): string {
        return `btn btn-ghost btn-sm btn-square ${active ? 'btn-active' : ''}`.trim();
    }

    function dismissBalancesHelp(): void {
        showBalancesHelp = false;
        if (browser) {
            localStorage.setItem(BALANCES_HELP_DISMISSED_KEY, '1');
        }
    }

    function openBalancesHelp(): void {
        showBalancesHelp = true;
    }

    onMount(() => {
        if (!browser) return;
        const alreadyDismissed = localStorage.getItem(BALANCES_HELP_DISMISSED_KEY) === '1';
        showBalancesHelp = !alreadyDismissed;
    });

    let lastWrappedStaticPriceRequestKey = '';

    $effect(() => {
        if (!browser) {
            return;
        }

        const balances = $circlesBalances?.data ?? [];
        const addresses = pickWrappedStaticTokenAddresses(balances);
        const requestKey = addresses.join(',');

        if (requestKey === lastWrappedStaticPriceRequestKey) {
            return;
        }
        lastWrappedStaticPriceRequestKey = requestKey;

        if (addresses.length === 0) {
            wrappedStaticPrices.set({});
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const response = await fetch('/api/prices/wrapped-static', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ addresses }),
                });

                if (!response.ok) {
                    throw new Error(`Price endpoint failed with status ${response.status}`);
                }

                const payload = (await response.json()) as { prices?: WrappedStaticPriceMap };
                if (!cancelled) {
                    wrappedStaticPrices.set(payload.prices ?? {});
                }
            } catch (error) {
                console.warn('[balances] wrapped static pricing failed', error);
                if (!cancelled) {
                    const fallback: WrappedStaticPriceMap = {};
                    for (const address of addresses) {
                        fallback[address] = {
                            priceUsd: null,
                            source: 'balancer-v2-subgraph-token-latestUSDPrice',
                        };
                    }
                    wrappedStaticPrices.set(fallback);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    });

    // Shape this like other lists so GenericList can key rows
    const filteredAll = derived(
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

            return filteredData;
        }
    );

    const searchedAll = derived([filteredAll, searchQuery], ([$filteredAll, $searchQuery]) => {
        const q = ($searchQuery ?? '').toLowerCase().trim();
        if (!q) return $filteredAll;
        return $filteredAll.filter((item) => {
            const owner = String((item as any).tokenOwner ?? '').toLowerCase();
            const token = String((item as any).tokenAddress ?? '').toLowerCase();
            return owner.includes(q) || token.includes(q);
        });
    });

    let filteredStore = derived(
        [searchedAll, circlesBalances],
        ([$searchedAll, $circlesBalances]) => {
            return {
                data: $searchedAll,
                next: $circlesBalances.next,
                ended: $circlesBalances.ended
            };
        }
    );

    const onSearchInputKeydown = createListInputArrowDownHandler({
        getScope: () => balancesListScopeEl,
        rowSelector: '[data-balance-row]'
    });
</script>

{#snippet balancesToolbarActions()}
    <button
            type="button"
            class={filterButtonClass($showFilters)}
            aria-label={$showFilters ? 'Hide filters' : 'Show filters'}
            aria-expanded={$showFilters}
            aria-controls={FILTER_PANEL_ID}
            onclick={toggleFilters}
            title="Filter"
    >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path d="M3 4h18v2l-7 7v5l-4 2v-7L3 6V4z"></path>
        </svg>
    </button>

    <button
            type="button"
            class="btn btn-ghost btn-sm btn-circle border border-base-300/70 bg-base-100 hover:bg-base-200"
            aria-label="Why so many Circles?"
            title="Why so many Circles?"
            onclick={openBalancesHelp}
    >
        <Lucide icon={LCircleHelp} size={16} class="text-primary/80" ariaLabel="" />
    </button>
{/snippet}

{#snippet balancesToolbarBelow()}
    {#if $showFilters}
        <div id={FILTER_PANEL_ID} class="space-y-3">
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
{/snippet}

<ListShell
    query={searchQuery}
    searchPlaceholder="Search by owner or token address"
    toolbarActions={balancesToolbarActions}
    toolbarBelow={balancesToolbarBelow}
    inputDataAttribute="data-balances-search-input"
    onInputKeydown={onSearchInputKeydown}
    isEmpty={$filteredAll.length === 0}
    ended={$circlesBalances.ended}
    emptyRequiresEnd={true}
    isNoMatches={$filteredAll.length > 0 && $searchedAll.length === 0}
    emptyLabel="No balances"
    noMatchesLabel="No matching balances"
    wrapInListContainer={false}
>
    <div data-balances-list-scope bind:this={balancesListScopeEl} class="relative">
        {#if showBalancesHelp}
            <div class="absolute right-0 top-1 z-20 w-full max-w-sm rounded-xl border border-base-300 bg-base-100 p-3 shadow-lg">
                <div class="flex items-start justify-between gap-2">
                    <div>
                        <div class="text-xs font-semibold text-base-content/70">Why so many Circles?</div>
                        <ul class="mt-2 space-y-1 text-xs text-base-content/80">
                            {#each WHY_MANY_CIRCLES_LINES as line}
                                <li>{line}</li>
                            {/each}
                        </ul>
                    </div>

                    <button
                            type="button"
                            class="btn btn-ghost btn-xs btn-square"
                            aria-label="Dismiss help"
                            title="Dismiss"
                            onclick={dismissBalancesHelp}
                    >
                        <Lucide icon={LX} size={14} class="text-base-content/70" ariaLabel="" />
                    </button>
                </div>
            </div>
        {/if}

        <GenericList
            store={filteredStore}
            row={BalanceRow}
            rowHeight={72}
            expectedPageSize={25}
            maxPlaceholderPages={1}
            placeholderRow={BalanceRowPlaceholder}
        />
    </div>
</ListShell>
