<script lang="ts">
    import { derived, writable } from 'svelte/store';
    import VirtualList from '$lib/shared/ui/lists/VirtualList.svelte';
    import TransactionRow from './TransactionRow.svelte';
    import TransactionRowPlaceholder from '$lib/shared/ui/lists/placeholders/TransactionRowPlaceholder.svelte';
    import { groupedTransactionHistory as transactionHistory } from '$lib/shared/state/transactionHistory';
    interface Props {
        filter?: 'all' | 'received' | 'sent' | 'mints';
    }
    let { filter = 'all' }: Props = $props();

    const TRANSACTION_ROW_HEIGHT = 84;
    let transactionsListScopeEl: HTMLDivElement | null = $state(null);

    const filterStore = writable<string>(filter);
    $effect(() => { filterStore.set(filter); });

    const filteredHistory = derived(
        [transactionHistory, filterStore],
        ([$th, $f]) => {
            if ($f === 'all') return $th;
            return {
                ...$th,
                data: $th.data.filter((item) => {
                    const isMint = item.type === 'mint' || item.hasMint;
                    if ($f === 'mints') return isMint;
                    if ($f === 'sent') return !isMint && item.netCircles < 0;
                    if ($f === 'received') return !isMint && item.netCircles > 0;
                    return true;
                }),
            };
        }
    );
</script>

<div
    data-transactions-list-scope
    bind:this={transactionsListScopeEl}
    style={`--transaction-row-height: ${TRANSACTION_ROW_HEIGHT}px;`}
>
    <VirtualList
        row={TransactionRow}
        store={filteredHistory}
        rowHeight={TRANSACTION_ROW_HEIGHT}
        maxPlaceholderPages={2}
        expectedPageSize={25}
        eagerLoadMultiplier={2}
        placeholderRow={TransactionRowPlaceholder}
    />
</div>
