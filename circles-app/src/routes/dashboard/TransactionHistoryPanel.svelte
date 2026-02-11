<script lang="ts">
    import { derived, writable } from 'svelte/store';
    import ListShell from '$lib/shared/ui/lists/ListShell.svelte';
    import GenericList from '$lib/shared/ui/lists/GenericList.svelte';
    import TransactionRow from './TransactionRow.svelte';
    import {transactionHistory} from '$lib/shared/state/transactionHistory';
    import { createListInputArrowDownHandler } from '$lib/shared/ui/lists/utils/listInputArrowDown';

    const searchQuery = writable('');
    let transactionsListScopeEl: HTMLDivElement | null = $state(null);

    const searchedTransactionHistory = derived([transactionHistory, searchQuery], ([$history, $query]) => {
        const q = ($query ?? '').toLowerCase().trim();
        if (!q) return $history;
        const data = ($history?.data ?? []).filter((item) => {
            const from = String(item.from ?? '').toLowerCase();
            const to = String(item.to ?? '').toLowerCase();
            return from.includes(q) || to.includes(q);
        });
        return {
            ...$history,
            data,
        };
    });

    const onSearchInputKeydown = createListInputArrowDownHandler({
        getScope: () => transactionsListScopeEl,
        rowSelector: '[data-transaction-row]'
    });
</script>

<ListShell
    query={searchQuery}
    searchPlaceholder="Search by address"
    inputDataAttribute="data-transactions-search-input"
    onInputKeydown={onSearchInputKeydown}
    isEmpty={$transactionHistory.data.length === 0}
    isNoMatches={$transactionHistory.data.length > 0 && $searchedTransactionHistory.data.length === 0}
    emptyLabel="No transactions"
    noMatchesLabel="No matching transactions"
    wrapInListContainer={false}
>
    <div data-transactions-list-scope bind:this={transactionsListScopeEl}>
        <GenericList row={TransactionRow} store={searchedTransactionHistory} rowHeight={64} maxPlaceholderPages={0} expectedPageSize={25} />
    </div>
</ListShell>
