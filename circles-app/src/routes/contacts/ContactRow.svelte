<script lang="ts">
  import type { Address, EventRow } from '@aboutcircles/sdk-types';
  import ContactGroupRow from './ContactGroupRow.svelte';
  import { formatTrustRelation } from '$lib/shared/utils/helpers';

  interface ContactEventRow extends EventRow {
    address: Address;
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
