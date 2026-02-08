<script lang="ts">
    import GenericList from '$lib/components/GenericList.svelte';
    import TransactionRow from './TransactionRow.svelte';
    import {transactionHistory} from '$lib/shared/state/transactionHistory';
</script>

<GenericList row={TransactionRow} store={transactionHistory} rowHeight={64} maxPlaceholderPages={0} expectedPageSize={25} />
