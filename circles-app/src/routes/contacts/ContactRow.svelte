<script lang="ts">
  import type { EventRow } from '@circles-sdk/data';
  import ContactGroupRow from './ContactGroupRow.svelte';
  import { formatTrustRelation } from '$lib/utils/helpers';

  interface ContactEventRow extends EventRow {
    address: string;
    contact: any; // Type this properly based on your ContactListItem type
  }

  interface Props {
    item: ContactEventRow;
  }

  let { item }: Props = $props();
</script>

<ContactGroupRow
  address={item.address}
  trustRelation={formatTrustRelation(item.contact.row.relation)}
/>
