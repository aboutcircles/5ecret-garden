<script lang="ts">
  import type { EventRow } from '@circles-sdk/data';
  import { formatTrustRelation } from '$lib/utils/helpers';
  import { popupControls } from '$lib/stores/popUp';
  import ProfilePage from '$lib/pages/Profile.svelte';
  import BalanceListItem from '$lib/components/BalanceListItem.svelte';

  interface ContactEventRow extends EventRow {
    address: string;
    contact: any; // Type this properly based on your ContactListItem type
  }

  interface Props {
    item: ContactEventRow;
  }

  let { item }: Props = $props();

  const handleContactClick = () => {
    popupControls.open({
      component: ProfilePage,
      title: '',
      props: {
        address: item.address,
      },
    });
  };

  // Get contact name from profile or fallback to address
  const contactName = item.contact?.contactProfile?.name || 
                     `${item.address.slice(0, 6)}...${item.address.slice(-4)}`;
  
  const trustRelation = formatTrustRelation(item.contact.row.relation);
</script>

<BalanceListItem
  name={contactName}
  subtitle={trustRelation}
  address={item.address}
  avatar={item.contact?.contactProfile?.previewImageUrl}
  onClick={handleContactClick}
  variant="contact"
/>
