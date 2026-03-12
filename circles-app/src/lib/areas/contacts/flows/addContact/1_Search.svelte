<script lang="ts">
    import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
    import SearchAvatar from '$lib/areas/contacts/ui/pages/SearchAvatar.svelte';
    import { ADD_CONTACT_FLOW_SCAFFOLD_BASE } from './constants';
  import Invite from '$lib/areas/contacts/ui/pages/Invite.svelte';
  import { contacts } from '$lib/shared/state/contacts';
  import { openStep } from '$lib/shared/flow';
  import YouAlreadyTrust from './2_YouAlreadyTrust.svelte';
  import type { AddContactFlowContext } from './context';
  import type { Address } from '@aboutcircles/sdk-types';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { openAddTrustFlow } from '$lib/areas/trust/flows/addTrust/openAddTrustFlow';

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
      if (!avatarState.avatar) {
        throw new Error('Avatar store not available');
      }

      openAddTrustFlow({
        context: {
          actorType: 'avatar',
          actorAddress: avatarState.avatar.address,
          selectedTrustees: [avatar],
        },
      });
    }
  }
</script>

<FlowStepScaffold
  {...ADD_CONTACT_FLOW_SCAFFOLD_BASE}
  step={1}
  title="Find account"
  subtitle="Search for a person, organization, or group to add."
>

    <SearchAvatar
      avatarTypes={["CrcV2_RegisterHuman","CrcV2_RegisterOrganization","CrcV2_RegisterGroup"]}
      selectedAddress={context.selectedAddress}
      {oninvite}
      {onselect}
      searchType="contact"
      inputDataAttribute="data-popup-initial-input"
    />
  </FlowStepScaffold>
