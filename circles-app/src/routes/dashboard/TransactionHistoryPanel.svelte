<script lang="ts">
  import GenericList from '$lib/components/GenericList.svelte';
  import GroupedTransactionRow from './GroupedTransactionRow.svelte';
  import { groupedTransactionHistory } from '$lib/stores/transactionHistory';
</script>

<GenericList row={GroupedTransactionRow} store={groupedTransactionHistory} />
