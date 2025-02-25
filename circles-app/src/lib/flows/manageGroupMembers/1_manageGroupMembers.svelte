<script lang="ts">
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import SearchAvatar from '$lib/pages/SearchAvatar.svelte';
  import Invite from '$lib/pages/Invite.svelte';
  import { contacts } from '$lib/stores/contacts';
  import { popupControls } from '$lib/stores/popUp';
  import type { AddContactFlowContext } from './context';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import { addMembers, removeMembers } from '$lib/stores/groupAvatar';
  import Papa from 'papaparse';

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

    // if (!(
    //   existingContact?.row?.objectAvatar === address &&
    //   (existingContact.row.relation === 'trusts' ||
    //     existingContact.row.relation === 'mutuallyTrusts')
    // )) {
      const newAddress = event.detail.avatar;
      const addressList = selectedAddresses.split(',').map(addr => addr.trim());
      if (!addressList.includes(newAddress)) {
        selectedAddresses = selectedAddresses
          ? `${selectedAddresses}, ${newAddress}`
          : newAddress;
      // }

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

  async function handleRemoveMembers() {
    try {
      await removeMembers(selectedAddresses);
      selectedAddresses = '';
    } catch (error) {
      console.error('Failed to remove contacts:', error);
    }
  }

  async function handleImportCSV(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      const results = Papa.parse(csv, { header: true });
      if (results.data && Array.isArray(results.data)) {
        const addresses = results.data
          .map((row: any) => row.address)
          .filter(Boolean)
          .join(', ');
        selectedAddresses = selectedAddresses
          ? `${selectedAddresses}, ${addresses}`
          : addresses;
      }
    };
    reader.readAsText(file);
  }
</script>

<FlowDecoration>
  <p class="text-2xl font-bold">Add or Remove Members</p>
  <textarea
    bind:value={selectedAddresses}
    placeholder="Enter addresses separated by commas"
    rows="3"
    class="w-full p-2 mb-4 border rounded resize-y"
  />
  <div class="flex flex-row gap-x-2">
    <ActionButton action={handleAddMembers}>Add</ActionButton>
    <ActionButton action={handleRemoveMembers}>Remove</ActionButton>

    <div class="flex-grow"></div>
    <label class="cursor-pointer">
      Import CSV
      <input
        type="file"
        accept=".csv"
        class="hidden"
        on:change={handleImportCSV}
      />
    </label>
  </div>

  <p class="text-xl font-bold mt-4">Search for members</p>
  <SearchAvatar
    selectedAddress={context.selectedAddress}
    on:invite={handleInvite}
    on:select={handleSelect}
    searchType="contact"
  />
</FlowDecoration>
