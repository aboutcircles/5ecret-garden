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

  let addressesArray: string[] = [];
  let errorMessage = '';
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
    // const existingContact = $contacts.data[address];

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
      addressesArray = [...addressesArray, newAddress];
      context.selectedAddress = '';
    }
  }

  function handleErrors(error: any) {
    if (error?.info?.error?.code === 4001 || 
        error?.message?.includes('user rejected') ||
        error?.message?.includes('User denied transaction')) {
      errorMessage = 'Transaction was rejected';
      throw new Error('Transaction was rejected');
    }

    if (error?.message?.includes('No valid addresses provided')) {
      errorMessage = 'No valid addresses provided';
      throw error;
    }

    if (error?.message?.includes('Contract not initialized')) {
      errorMessage = 'Contract not initialized';
      throw error;
    }

    errorMessage = 'Tx failed, try passing less addresses';
    throw new Error('Tx failed, try passing less addresses');
  }

  async function handleAddMembers() {
    errorMessage = '';
    try {
      await addMembers(selectedAddresses);
      selectedAddresses = '';
    } catch (error: any) {
      console.error('Failed to add contacts:', error);
      handleErrors(error);
    }
  }

  async function handleRemoveMembers() {
    errorMessage = '';
    try {
      await removeMembers(selectedAddresses);
      selectedAddresses = '';
    } catch (error: any) {
      console.error('Failed to remove contacts:', error);
      handleErrors(error);
    }
  }

  function handleAddressesChange(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    const addresses = textarea.value
      .split(',')
      .map(addr => addr.trim())
      .filter(addr => addr);
    
    addressesArray = addresses;
  }

  async function handleImportCSV(event: Event) {
    errorMessage = '';
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      const results = Papa.parse(csv, { header: true });
      if (results.data && Array.isArray(results.data)) {
        addressesArray = [...addressesArray, ...results.data
          .map((row: any) => row.address)
          .filter(Boolean)
        ]
        addressesArray = [...addressesArray, ...addressesArray, ...addressesArray]
        const addressesStr = addressesArray.join(', ');
        // const addresses = results.data
        //   .map((row: any) => row.address)
        //   .filter(Boolean)
        //   .join(', ');
        selectedAddresses = addressesStr;
      }
      input.value = '';
    };
    reader.readAsText(file);
  }
</script>

<FlowDecoration>
  <h2 class="text-2xl font-bold">Add or Remove Members</h2>
  <p class="text-sm text-gray-500 text-right">{addressesArray.length} {addressesArray.length === 1 ? 'address' : 'addresses'}</p>
  <textarea
    bind:value={selectedAddresses}
    placeholder="Enter addresses separated by commas"
    rows="3"
    class="w-full p-2 mb-4 border rounded resize-y"
    on:input={handleAddressesChange}
  />
  <div class="flex flex-row gap-x-2">
    <div class="flex flex-col gap-x-2">
      <div class="flex flex-row gap-x-2">
        <ActionButton action={handleAddMembers}>Add</ActionButton>
        <ActionButton action={handleRemoveMembers}>Remove</ActionButton>
      </div>
      <p class="text-sm text-red-500 h-6">{errorMessage}</p>
    </div>

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
