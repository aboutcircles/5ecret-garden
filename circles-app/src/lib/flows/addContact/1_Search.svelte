<script lang="ts">
  import type { PopupContentApi } from '$lib/components/PopUp.svelte';
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import SearchAvatar from '$lib/pages/SearchAvatar.svelte';
  import type { AddContactFlowContext } from '$lib/flows/addContact/context';
  import type { AvatarRow } from '@circles-sdk/data';
  import Invite from '$lib/pages/Invite.svelte';
  import Trust from '$lib/pages/Trust.svelte';
  import YouAlreadyTrust from './2_YouAlreadyTrust.svelte';
  import { contacts } from '$lib/stores/contacts';

  export let contentApi: PopupContentApi;
  export let context: AddContactFlowContext;

  function handleInvite(event: CustomEvent<{ avatar: string }>) {
    console.log('Invite');
    contentApi.open({
      title: 'Invite someone',
      component: Invite,
      props: {
        address: event.detail.avatar,
        contentApi: contentApi,
      },
    });
  }

  async function handleSelect(event: CustomEvent<AvatarRow>) {
    context.selectedAddress = event.detail.avatar;
    console.log(context);
    console.log('Selected Address', event.detail.avatar);
    const existingContact = $contacts.data[context.selectedAddress];
    console.log('Existing Contact', existingContact);

    if (
      existingContact?.row?.objectAvatar === context.selectedAddress &&
      (existingContact.row.relation === 'trusts' ||
        existingContact.row.relation === 'mutuallyTrusts')
    ) {
      // already trusting the account
      contentApi.open({
        title: 'Untrust?',
        component: YouAlreadyTrust,
        props: {
          context: context,
          contentApi: contentApi,
        },
      });
    } else {
      contentApi.open({
        title: 'Trust',
        component: Trust,
        props: {
          address: event.detail.avatar,
          contentApi: contentApi,
        },
      });
    }
  }
</script>

<FlowDecoration>
  <p class="text-2xl font-bold mt-14">Add Contact</p>
  <SearchAvatar
    selectedAddress={context.selectedAddress}
    on:invite={handleInvite}
    on:select={handleSelect}
  />
</FlowDecoration>
