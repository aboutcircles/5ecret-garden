<script lang="ts">
  import GenericList from '$lib/components/GenericList.svelte';
  import GroupedTransactionRow from './GroupedTransactionRow.svelte';
  import { groupedTransactionHistory } from '$lib/stores/transactionHistory';

  interface Props {
    /** Transaction hash to highlight (from URL deep-link) */
    highlightTx?: string;
  }

  let { highlightTx }: Props = $props();
</script>

<GenericList
  row={GroupedTransactionRow}
  store={groupedTransactionHistory}
  rowProps={{ highlightTx }}
/>
