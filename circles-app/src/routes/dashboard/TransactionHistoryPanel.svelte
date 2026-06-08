<script lang="ts">
    import VirtualList from '$lib/shared/ui/lists/VirtualList.svelte';
    import TransactionRow from './TransactionRow.svelte';
    import TransactionRowPlaceholder from '$lib/shared/ui/lists/placeholders/TransactionRowPlaceholder.svelte';
    import {groupedTransactionHistory as transactionHistory} from '$lib/shared/state/transactionHistory';

    const TRANSACTION_ROW_HEIGHT = 76;
    let transactionsListScopeEl: HTMLDivElement | null = $state(null);
</script>

<div
    data-transactions-list-scope
    bind:this={transactionsListScopeEl}
    style={`--transaction-row-height: ${TRANSACTION_ROW_HEIGHT}px;`}
>
    <VirtualList
        row={TransactionRow}
        store={transactionHistory}
        rowHeight={TRANSACTION_ROW_HEIGHT}
        maxPlaceholderPages={2}
        expectedPageSize={25}
        eagerLoadMultiplier={2}
        placeholderRow={TransactionRowPlaceholder}
    />
</div>
