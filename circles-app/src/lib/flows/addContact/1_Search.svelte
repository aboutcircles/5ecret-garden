<script lang="ts">
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import SearchAvatar from '$lib/pages/SearchAvatar.svelte';
  import type { AvatarRow } from '@circles-sdk/data';
  import Invite from '$lib/pages/Invite.svelte';
  import Trust from '$lib/pages/Trust.svelte';
  import { contacts } from '$lib/stores/contacts';
  import { popupControls } from '$lib/stores/popUp';
  import YouAlreadyTrust from './2_YouAlreadyTrust.svelte';
  import type { AddContactFlowContext } from './context';

  let context: AddContactFlowContext = {
    selectedAddress: '',
  };

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

  async function handleSelect(event: CustomEvent<AvatarRow>) {
    context.selectedAddress = event.detail.avatar;
    const existingContact = $contacts.data[context.selectedAddress];

    if (
      existingContact?.row?.objectAvatar === context.selectedAddress &&
      (existingContact.row.relation === 'trusts' ||
        existingContact.row.relation === 'mutuallyTrusts')
    ) {
      // already trusting the account
      popupControls.open({
        title: 'Untrust?',
        component: YouAlreadyTrust,
        props: {
          context: context,
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
  <p class="text-2xl font-bold">Add Contact</p>
  <SearchAvatar
    selectedAddress={context.selectedAddress}
    on:invite={handleInvite}
    on:select={handleSelect}
  />
</FlowDecoration>
