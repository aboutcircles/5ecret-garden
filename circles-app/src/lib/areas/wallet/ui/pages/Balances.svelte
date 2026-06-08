<script lang="ts">
    import { browser } from '$app/environment';
    import {circlesBalances} from '$lib/shared/state/circlesBalances';
    import { circles } from '$lib/shared/state/circles';
    import {derived, writable, type Writable} from 'svelte/store';
    import BalanceRow from '$lib/areas/wallet/ui/components/BalanceRow.svelte';
    import BalanceRowPlaceholder from '$lib/shared/ui/lists/placeholders/BalanceRowPlaceholder.svelte';
    import type {EventRow, TokenBalance} from '@aboutcircles/sdk-types';
    import { buildGroupOwnerSet } from '$lib/shared/utils/tokenClassification';

    type BalanceEventRow = EventRow & TokenBalance;
    import Filter from '$lib/shared/ui/lists/Filter.svelte';
    import GenericList from '$lib/shared/ui/lists/GenericList.svelte';
    import ListShell from '$lib/shared/ui/lists/ListShell.svelte';
    import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
    import { CircleHelp as LCircleHelp, X as LX } from 'lucide';
    import { createListInputArrowDownHandler } from '$lib/shared/ui/lists/utils/listInputArrowDown';
    import { WHY_MANY_CIRCLES_LINES } from '$lib/shared/content/trustRoutingCopy';
    import { quoteTokenPriceRaw, resolveStaticWrappedTokenAddress } from '$lib/pricing/balancerPrice';
    import {
        pickWrappedStaticTokenAddresses,
        type WrappedStaticPriceMap,
    } from '$lib/shared/pricing/wrappedStaticPricing';
    import { setBalancePricingContext } from '$lib/shared/pricing/balancePricingContext';
    import { T } from '$lib/design-system/tokens.js';

    interface Props {
        initialFilterType?: 'personal' | 'group';
    }

    let { initialFilterType }: Props = $props();

    let filterVersion = writable<number | undefined>(undefined);
    let filterType = writable<'personal' | 'group' | undefined>(initialFilterType);
    let filterToken = writable<'erc20' | 'erc1155' | undefined>(undefined);
    let sortOrder = writable<'total' | 'price'>('total');
    let searchQuery = writable<string>('');
    let balancesListScopeEl: HTMLDivElement | null = $state(null);
    const priceSortValues: Writable<Record<string, number | null>> = writable({});
    const priceSortInFlight: Map<string, Promise<void>> = new Map();

    // Filters panel state — store to ensure reactivity in all modes. Open by
    // default when the caller pre-selected a filter so the active chip is
    // visible (otherwise the list would silently exclude rows).
    const showFilters: Writable<boolean> = writable(initialFilterType !== undefined);
    const FILTER_PANEL_ID: string = 'balance-filters';

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
    }

    function openBalancesHelp(): void {
        showBalancesHelp = true;
    }

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
            const allBalances = Object.values($circlesBalances.data);
            const groupOwners = buildGroupOwnerSet(allBalances);
            const filteredData = allBalances
                .filter((balance) => {
                    const matchesVersion = filterVersion === undefined || balance.version === filterVersion;
                    const isGroup = groupOwners.has(balance.tokenOwner?.toLowerCase?.() ?? '');
                    const matchesType =
                        filterType === undefined ||
                        (filterType === 'personal' ? !isGroup :
                            filterType === 'group' ? isGroup : true);
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
                } as BalanceEventRow));

            return filteredData;
        }
    );

    const searchedAll = derived([filteredAll, searchQuery], ([$filteredAll, $searchQuery]) => {
        const q = ($searchQuery ?? '').toLowerCase().trim();
        if (!q) return $filteredAll;
        return $filteredAll.filter((item) => {
            const owner = String(item.tokenOwner ?? '').toLowerCase();
            const token = String(item.tokenAddress ?? '').toLowerCase();
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
        style="width:34px;height:34px;border-radius:9999px;border:1px solid {$showFilters ? T.primary : T.hairline};background:{$showFilters ? T.primaryFaint : T.surface};color:{$showFilters ? T.primary : T.inkMuted};display:inline-flex;align-items:center;justify-content:center;cursor:pointer;"
        aria-label={$showFilters ? 'Hide filters' : 'Show filters'}
        aria-expanded={$showFilters}
        aria-controls={FILTER_PANEL_ID}
        onclick={toggleFilters}
        title="Filter"
    >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
            <path d="M3 4h18v2l-7 7v5l-4 2v-7L3 6V4z"></path>
        </svg>
    </button>

    <button
        type="button"
        style="width:34px;height:34px;border-radius:9999px;border:1px solid {T.hairline};background:{T.surface};color:{T.primary};display:inline-flex;align-items:center;justify-content:center;cursor:pointer;"
        aria-label="Why so many Circles?"
        title="Why so many Circles?"
        onclick={openBalancesHelp}
    >
        <Lucide icon={LCircleHelp} size={14} ariaLabel="" />
    </button>
{/snippet}

{#snippet balancesToolbarBelow()}
    {#if $showFilters}
        <div id={FILTER_PANEL_ID} style="display:flex;flex-direction:column;gap:10px;padding:10px 14px;background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};border-radius:14px;margin-top:6px;">
            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;">
                <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;min-width:60px;">Version</span>
                <Filter text="All" filter={filterVersion} value={undefined}/>
                <Filter text="V1" filter={filterVersion} value={1}/>
                <Filter text="V2" filter={filterVersion} value={2}/>
            </div>

            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;">
                <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;min-width:60px;">Type</span>
                <Filter text="All" filter={filterType} value={undefined}/>
                <Filter text="Personal" filter={filterType} value={'personal'}/>
                <Filter text="Group" filter={filterType} value={'group'}/>
            </div>

            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;">
                <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;min-width:60px;">Token</span>
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
            <div style="
                position:absolute;right:0;top:4px;z-index:20;width:100%;max-width:360px;
                background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;
                box-shadow:{T.shadow.md};padding:12px 14px;
            ">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Why so many Circles?</div>
                        <ul style="margin:8px 0 0 0;padding-left:14px;display:flex;flex-direction:column;gap:4px;font-size:11.5px;color:{T.inkBody};line-height:1.5;">
                            {#each WHY_MANY_CIRCLES_LINES as line}
                                <li>{line}</li>
                            {/each}
                        </ul>
                    </div>

                    <button
                        type="button"
                        style="width:24px;height:24px;border-radius:9999px;border:0;background:{T.pageDeep};color:{T.inkMuted};display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;"
                        aria-label="Dismiss help"
                        title="Dismiss"
                        onclick={dismissBalancesHelp}
                    >
                        <Lucide icon={LX} size={12} ariaLabel="" />
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
