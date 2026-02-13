<script lang="ts">
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import FlowStepHeader from '$lib/shared/ui/flow/FlowStepHeader.svelte';
  import SearchAvatar from '$lib/areas/contacts/ui/pages/SearchAvatar.svelte';
  import Invite from '$lib/areas/contacts/ui/pages/Invite.svelte';
  import Trust from '$lib/areas/contacts/ui/pages/Trust.svelte';
  import { contacts } from '$lib/shared/state/contacts';
  import { openStep } from '$lib/shared/flow/runtime';
  import YouAlreadyTrust from './2_YouAlreadyTrust.svelte';
  import type { AddContactFlowContext } from './context';
  import type { Address } from '@circles-sdk/utils';

  let context: AddContactFlowContext = $state({
    selectedAddress: '0x0',
    trustVersion: undefined,
  });

  function oninvite(avatar: Address) {
    openStep({
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
      context.trustVersion = existingContact.avatarInfo?.version;
      // already trusting the account
      openStep({
        title: 'Manage trust',
        component: YouAlreadyTrust,
        props: {
          context: context,
        },
      });
    } else {
      openStep({
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
  <div class="w-full space-y-4" tabindex="-1" data-popup-initial-focus>
    <FlowStepHeader
      step={1}
      total={2}
      title="Find account"
      subtitle="Search for a person, organization, or group to add."
      labels={['Find account', 'Trust status']}
    />

    <SearchAvatar
      avatarTypes={["CrcV2_RegisterHuman","CrcV2_RegisterOrganization","CrcV2_RegisterGroup"]}
      selectedAddress={context.selectedAddress}
      {oninvite}
      {onselect}
      searchType="contact"
      inputDataAttribute="data-popup-initial-input"
    />
  </div>
</FlowDecoration>
