<script lang="ts">
  import type { EventRow } from '@aboutcircles/sdk-types';
  import ContactGroupRow from './ContactGroupRow.svelte';
  import { formatTrustRelation } from '$lib/shared/utils/helpers';

  interface ContactEventRow extends EventRow {
    address: string;
    contact: {
      contactProfile?: any;
      avatarInfo?: any;
      row: { relation: string };
    };
  }

  interface Props {
    item: ContactEventRow;
  }

  let { item }: Props = $props();
</script>

<ContactGroupRow
  address={item.address}
  profile={item.contact?.contactProfile}
  avatarInfo={item.contact?.avatarInfo}
  trustRelation={formatTrustRelation(item.contact.row.relation)}
/>
