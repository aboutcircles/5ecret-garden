<script lang="ts">
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import SearchAvatar from '$lib/pages/SearchAvatar.svelte';
  import Invite from '$lib/pages/Invite.svelte';
  import { contacts } from '$lib/stores/contacts';
  import { popupControls } from '$lib/stores/popUp';
  import type { AddContactFlowContext } from './context';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import { addMembers } from '$lib/stores/groupAvatar';

  let context: AddContactFlowContext = {
    selectedAddress: '',
  };

  // TODO: Remove this?
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

  let selectedAddresses = '';
  async function handleSelect(event: CustomEvent<{ avatar: string }>) {
    const address = event.detail.avatar;
    const existingContact = $contacts.data[address];

    if (!(
      existingContact?.row?.objectAvatar === address &&
      (existingContact.row.relation === 'trusts' ||
        existingContact.row.relation === 'mutuallyTrusts')
    )) {
      const newAddress = event.detail.avatar;
      const addressList = selectedAddresses.split(',').map(addr => addr.trim());
      if (!addressList.includes(newAddress)) {
        selectedAddresses = selectedAddresses
          ? `${selectedAddresses}, ${newAddress}`
          : newAddress;
      }

      context.selectedAddress = '';
    }
  }

  async function handleAddMembers() {
    try {
      await addMembers(selectedAddresses);
      selectedAddresses = '';
    } catch (error) {
      console.error('Failed to add contacts:', error);
    }
  }
</script>

<FlowDecoration>
  <p class="text-2xl font-bold">Add Members (batch)</p>
  <textarea
    bind:value={selectedAddresses}
    placeholder="Enter addresses separated by commas"
    rows="3"
    class="w-full p-2 mb-4 border rounded resize-y"
  />
  <ActionButton action={handleAddMembers}> Add </ActionButton>
  <p class="text-xl font-bold mt-4">Search for members</p>
  <SearchAvatar
    selectedAddress={context.selectedAddress}
    on:invite={handleInvite}
    on:select={handleSelect}
    searchType="contact"
  />
</FlowDecoration>
