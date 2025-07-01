<script lang="ts">
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import SearchAvatar from '$lib/pages/SearchAvatar.svelte';
  import Invite from '$lib/pages/Invite.svelte';
  import { popupControls } from '$lib/stores/popUp';
  import type { AddContactFlowContext } from './context';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import Papa from 'papaparse';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { ethers } from 'ethers';
  import type { Address } from '@circles-sdk/utils';
  import DownloadIcon from '$lib/components/icons/DownloadIcon.svelte';
  import UploadIcon from '$lib/components/icons/UploadIcon.svelte';
  import { contacts } from '$lib/stores/contacts';

  let context: AddContactFlowContext = $state({
    selectedAddress: '' as `0x${string}`,
  });

  let addressesArray: string[] = $state([]);
  let errorMessage = $state('');
  let selectedAddresses = $state('');
  
  // Reactive state to check if buttons should be disabled
  let hasValidAddresses = $derived(selectedAddresses.trim().length > 0 && addressesArray.length > 0);
  
  // TODO: Remove this?
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
    // const existingContact = $contacts.data[address];

    // if (!(
    //   existingContact?.row?.objectAvatar === address &&
    //   (existingContact.row.relation === 'trusts' ||
    //     existingContact.row.relation === 'mutuallyTrusts')
    // )) {
    const newAddress = avatar;
    const addressList = selectedAddresses.split(',').map((addr) => addr.trim());
    if (!addressList.includes(newAddress)) {
      selectedAddresses = selectedAddresses
        ? `${selectedAddresses}, ${newAddress}`
        : newAddress;
      // }
      addressesArray = [...addressesArray, newAddress];
      context.selectedAddress = '' as `0x${string}`;
    }
  }

  function handleErrors(error: any) {
    if (
      error?.info?.error?.code === 4001 ||
      error?.message?.includes('user rejected') ||
      error?.message?.includes('User denied transaction')
    ) {
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

  const sanitizeAddresses = (addrStr: string): Address[] => {
    const addresses = addrStr
      .split(',')
      .map((addr) => addr.trim())
      .filter((addr) => ethers.isAddress(addr));
    return addresses as Address[];
  };

  export async function handleAddMembers(addrStr: string, untrust: boolean) {
    const addresses = sanitizeAddresses(addrStr);
    if (addresses.length === 0) {
      throw new Error('No valid addresses provided');
    }

    try {
      untrust
        ? await avatarState.avatar?.untrust(addresses)
        : await avatarState.avatar?.trust(addresses);
      selectedAddresses = '';
    } catch (error: any) {
      handleErrors(error);
    }
  }

  function handleAddressesChange(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    const addresses = textarea.value
      .split(',')
      .map((addr) => addr.trim())
      .filter((addr) => addr);

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
        addressesArray = [
          ...addressesArray,
          ...results.data.map((row: any) => row.address).filter(Boolean),
        ];
        const addressesStr = addressesArray.join(', ');
        selectedAddresses = addressesStr;
      }
      input.value = '';
    };
    reader.readAsText(file);
  }

  async function handleExportCSV() {
    const contactsData = Object.entries($contacts.data);
    const csvData = contactsData.map(([address, contact]) => ({
      address: address,
      name: contact?.contactProfile?.name || '',
      relation: contact?.row?.relation || ''
    }));
    
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `contacts-export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
</script>

<FlowDecoration>
  <div class="flex flex-row gap-x-1 justify-end items-center pb-1">
    <p class="text-sm text-gray-500 text-right">
      {addressesArray.length}
      {addressesArray.length === 1 ? 'address' : 'addresses'}
    </p>
    <button
      class="p-2 hover:bg-gray-100 rounded-full"
      onclick={() => {
        selectedAddresses = '';
        addressesArray = [];
      }}
    >
      <img class="w-2 h-2" src="/x-mark.svg" alt="Clear addresses" />
    </button>
  </div>

  <textarea
    bind:value={selectedAddresses}
    placeholder="Enter addresses separated by commas"
    rows="3"
    class="w-full p-2 mb-4 border rounded resize-y"
    oninput={handleAddressesChange}
  ></textarea>
  <div class="flex flex-row gap-x-2">
    <div class="flex flex-col gap-x-2">
      <div class="flex flex-row gap-x-2">
        <ActionButton 
          action={() => handleAddMembers(selectedAddresses, false)}
          disabled={!hasValidAddresses}
        >
          {avatarState.isGroup ? 'Add' : 'Trust'}
        </ActionButton>
        <ActionButton 
          action={() => handleAddMembers(selectedAddresses, true)}
          disabled={!hasValidAddresses}
        >
          {avatarState.isGroup ? 'Remove' : 'Untrust'}
        </ActionButton>
      </div>
      <p class="text-sm text-red-500 h-6">{errorMessage}</p>
    </div>

    <div class="flex-grow"></div>
    <div class="flex flex-col gap-2">
      <label class="flex items-center gap-2 cursor-pointer text-sm hover:text-primary transition-colors">
        <UploadIcon size="sm" />
        Import CSV
        <input
          type="file"
          accept=".csv"
          class="hidden"
          onchange={handleImportCSV}
        />
      </label>
      <button 
        class="flex items-center gap-2 text-sm hover:text-primary transition-colors"
        onclick={handleExportCSV}
      >
        <DownloadIcon size="sm" />
        Export CSV
      </button>
    </div>
  </div>

  <p class="text-xl font-bold mt-4">Search for {avatarState.isGroup ? 'members' : 'contacts'}</p>
  <SearchAvatar
    selectedAddress={context.selectedAddress}
    {oninvite}
    {onselect}
    searchType="contact"
  />
</FlowDecoration>
