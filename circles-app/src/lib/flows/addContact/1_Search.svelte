<script lang="ts">
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import SearchAvatar from '$lib/pages/SearchAvatar.svelte';
  import type { AvatarRow } from '@circles-sdk/data';
  import Invite from '$lib/pages/Invite.svelte';
  import Trust from '$lib/pages/Trust.svelte';
  import { contacts } from '$lib/stores/contacts';
  import { popupControls } from '$lib/stores/popUp';
  import Untrust from '$lib/pages/Untrust.svelte';

  function handleInvite(event: CustomEvent<{ avatar: string }>) {
    console.log('Invite');
    popupControls.open({
      title: 'Invite someone',
      component: Invite,
      props: {
        address: event.detail.avatar,
      },
    });
  }

  let selectedAddress: string = '';

  async function handleSelect(event: CustomEvent<AvatarRow>) {
    const existingContact = $contacts.data[selectedAddress];

    if (
      existingContact?.row?.objectAvatar === selectedAddress &&
      (existingContact.row.relation === 'trusts' ||
        existingContact.row.relation === 'mutuallyTrusts')
    ) {
      // already trusting the account
      popupControls.open({
        title: 'Untrust?',
        component: Untrust,
        props: {
          address: event.detail.avatar,
        },
      });
    } else {
      popupControls.open({
        title: 'Trust',
        component: Trust,
        props: {
          address: event.detail.avatar,
        },
      });
    }
  }
</script>

<FlowDecoration>
  <p class="text-2xl font-bold mt-14">Add Contact</p>
  <SearchAvatar
    {selectedAddress}
    on:invite={handleInvite}
    on:select={handleSelect}
  />
</FlowDecoration>
