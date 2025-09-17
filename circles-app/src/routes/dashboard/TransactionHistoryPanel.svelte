<script lang="ts">
    import GenericList from '$lib/components/GenericList.svelte';
    import TransactionRow from './TransactionRow.svelte';
    import { transactionHistory } from '$lib/stores/transactionHistory';
</script>

<div class="section--list">
    <GenericList row={TransactionRow} store={transactionHistory} />
</div>
