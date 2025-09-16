<script lang="ts">
    import { circlesBalances } from '$lib/stores/circlesBalances';
    import { totalCirclesBalance } from '$lib/stores/totalCirclesBalance';
    import { roundToDecimals } from '$lib/utils/shared';
    import { derived, writable } from 'svelte/store';
    import Filter from '$lib/components/Filter.svelte';
    import GenericList from '$lib/components/GenericList.svelte';
    import BalanceRow from '$lib/components/BalanceRow.svelte';
    import type {EventRow} from "@circles-sdk/data";

    let filterVersion = writable<number | undefined>(undefined);
    let filterType = writable<'personal' | 'group' | undefined>(undefined);
    let filterToken = writable<'erc20' | 'erc1155' | undefined>(undefined);

    // IMPORTANT: shape this like other lists so GenericList can key rows
    // We wrap each balance into an EventRow-like object.
    let filteredStore = derived(
        [circlesBalances, filterVersion, filterType, filterToken],
        ([$circlesBalances, filterVersion, filterType, filterToken]) => {
            const filteredData = Object
                .values($circlesBalances.data)
                .filter((balance) => {
                    const byVersion =
                        filterVersion === undefined || balance.version === filterVersion;
                    const byType =
                        filterType === undefined ||
                        (filterType === 'personal' ? !balance.isGroup :
                            filterType === 'group' ? balance.isGroup : true);
                    const byToken =
                        filterToken === undefined ||
                        (filterToken === 'erc20' ? balance.isErc20 :
                            filterToken === 'erc1155' ? balance.isErc1155 : true);

                    // hide dust < 0.01 CRC (in atto)
                    return byVersion && byType && byToken &&
                        BigInt(balance.attoCircles) >= 10_000_000_000_000_000n;
                })
                .map((balance, i) => ({
                    // Give GenericList a stable-ish key shape like EventRow
                    // (this mirrors what you already do in Contacts)
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

<div class="page page-pt page-stack page--lg">
    <div class="w-full flex items-center gap-2">
        <h1 class="h2">Balance breakdown</h1>
    </div>

    <!-- Filter -->
    <div class="flex flex-wrap items-center gap-2">
        <p class="text-sm">Version</p>
        <Filter text="All" filter={filterVersion} value={undefined} />
        <Filter text="Version 1" filter={filterVersion} value={1} />
        <Filter text="Version 2" filter={filterVersion} value={2} />
    </div>

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
        <div class="flex-grow flex justify-end">
            <span class="muted tabular-nums">{roundToDecimals($totalCirclesBalance)} CRC</span>
        </div>
    </div>

    <div class="section--list">
        <!-- Use the shared list component for consistent spacing/dividers/loader -->
        <GenericList store={filteredStore} row={BalanceRow} />
    </div>
</div>
