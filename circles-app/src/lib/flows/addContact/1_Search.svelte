<script lang="ts">
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import SearchAvatar from '$lib/pages/SearchAvatar.svelte';
  import Invite from '$lib/pages/Invite.svelte';
  import Trust from '$lib/pages/Trust.svelte';
  import { contacts } from '$lib/stores/contacts';
  import { popupControls } from '$lib/stores/popUp';
  import YouAlreadyTrust from './2_YouAlreadyTrust.svelte';
  import type { AddContactFlowContext } from './context';
  import type { Address } from '@circles-sdk/utils';

  let context: AddContactFlowContext = $state({
    selectedAddress: '0x0',
  });

  function oninvite(avatar: Address) {
    popupControls.open({
      title: 'Invite someone',
      component: Invite,
      props: {
        address: avatar,
      },
    });
  }

  async function onselect(avatar: Address) {
    context.selectedAddress = avatar;
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
          address: avatar,
        },
      });
    }
  }
</script>

<FlowDecoration>
  <SearchAvatar
    avatarTypes={["CrcV2_RegisterHuman","CrcV2_RegisterOrganization","CrcV2_RegisterGroup"]}
    selectedAddress={context.selectedAddress}
    {oninvite}
    {onselect}
    searchType="contact"
  />
</FlowDecoration>
