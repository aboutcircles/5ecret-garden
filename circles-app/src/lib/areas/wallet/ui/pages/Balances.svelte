<script lang="ts">
    import { browser } from '$app/environment';
    import {circlesBalances} from '$lib/shared/state/circlesBalances';
    import { circles } from '$lib/shared/state/circles';
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
    import { quoteTokenPriceRaw, resolveStaticWrappedTokenAddress } from '$lib/pricing/balancerPrice';

    let filterVersion = writable<number | undefined>(undefined);
    let filterType = writable<'personal' | 'group' | undefined>(undefined);
    let filterToken = writable<'erc20' | 'erc1155' | undefined>(undefined);
    let sortOrder = writable<'total' | 'price'>('total');
    let searchQuery = writable<string>('');
    let balancesListScopeEl: HTMLDivElement | null = $state(null);
    const priceSortValues: Writable<Record<string, number | null>> = writable({});
    const priceSortInFlight: Map<string, Promise<void>> = new Map();

    // Filters panel state — store to ensure reactivity in all modes
    const showFilters: Writable<boolean> = writable(false);
    const FILTER_PANEL_ID: string = 'balance-filters';
    const BALANCES_HELP_DISMISSED_KEY = 'balances-help-dismissed-v1';

    let showBalancesHelp: boolean = $state(false);

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

    function priceKeyOf(item: any): string {
        const owner = String(item?.tokenOwner ?? '').toLowerCase();
        const token = String(item?.tokenAddress ?? '').toLowerCase();
        return `${owner}:${token}`;
    }

    async function ensurePriceSortValue(item: any): Promise<void> {
        const key = priceKeyOf(item);
        const current = $priceSortValues[key];
        if (current !== undefined || priceSortInFlight.has(key)) {
            return;
        }

        const sdk = $circles;
        if (!sdk) {
            return;
        }

        const promise = (async () => {
            const resolved = await resolveStaticWrappedTokenAddress({
                tokenType: item?.tokenType,
                isWrapped: item?.isWrapped,
                tokenAddress: item?.tokenAddress,
                tokenOwner: item?.tokenOwner,
                version: item?.version,
                sdk
            });

            if (!resolved) {
                priceSortValues.update((s) => (s[key] !== undefined ? s : { ...s, [key]: null }));
                return;
            }

            const quoted = await quoteTokenPriceRaw(resolved);
            const numericPrice = quoted.ok && quoted.pricePerToken != null ? quoted.pricePerToken : null;
            priceSortValues.update((s) => ({ ...s, [key]: numericPrice }));
        })().finally(() => {
            priceSortInFlight.delete(key);
        });

        priceSortInFlight.set(key, promise);
        await promise;
    }

    $effect(() => {
        if ($sortOrder !== 'price') return;
        if (!$circles) return;

        for (const row of $searchedAll) {
            void ensurePriceSortValue(row as any);
        }
    });

    const sortedAll = derived([searchedAll, sortOrder, priceSortValues], ([$searchedAll, $sortOrder, $priceSortValues]) => {
        const rows = [...$searchedAll];

        if ($sortOrder === 'price') {
            rows.sort((a: any, b: any) => {
                const pa = $priceSortValues[priceKeyOf(a)];
                const pb = $priceSortValues[priceKeyOf(b)];
                const va = typeof pa === 'number' ? pa : Number.NEGATIVE_INFINITY;
                const vb = typeof pb === 'number' ? pb : Number.NEGATIVE_INFINITY;
                if (vb !== va) return vb - va;
                return Number(b?.circles ?? 0) - Number(a?.circles ?? 0);
            });
            return rows;
        }

        rows.sort((a: any, b: any) => Number(b?.circles ?? 0) - Number(a?.circles ?? 0));
        return rows;
    });

    let filteredStore = derived(
        [sortedAll, circlesBalances],
        ([$sortedAll, $circlesBalances]) => {
            return {
                data: $sortedAll,
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

            <div class="flex flex-wrap items-center gap-2">
                <p class="text-sm">Order</p>
                <Filter text="Total" filter={sortOrder} value={'total'}/>
                <Filter text="Price" filter={sortOrder} value={'price'}/>
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
