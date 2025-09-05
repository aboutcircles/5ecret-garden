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
  import Trust from "$lib/pages/Trust.svelte";

  let context: AddContactFlowContext = $state({
    selectedAddress: '',
  });

  let addressesArray: string[] = $state([]);
  let errorMessage = $state('');
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
  function ontrust(avatar: Address) {
    popupControls.open({
      title: 'Trust',
      component: Trust,
      props: {
        address: avatar,
      },
    });
  }

  let selectedAddresses = $state('');
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
      context.selectedAddress = '0x0';
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
</script>

<FlowDecoration>
  <h2 class="text-2xl font-bold">
    Add or remove {avatarState.isGroup ? 'members' : 'contacts'}
  </h2>
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
        <ActionButton action={() => handleAddMembers(selectedAddresses, false)}
          >{avatarState.isGroup ? 'Add' : 'Trust'}</ActionButton
        >
        <ActionButton action={() => handleAddMembers(selectedAddresses, true)}
          >{avatarState.isGroup ? 'Remove' : 'Untrust'}</ActionButton
        >
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
        onchange={handleImportCSV}
      />
    </label>
  </div>

  <p class="text-xl font-bold mt-4">Search for {avatarState.isGroup ? 'members' : 'contacts'}</p>
  <SearchAvatar
    selectedAddress={context.selectedAddress}
    {oninvite}
    {onselect}
    {ontrust}
    searchType="contact"
  />
</FlowDecoration>
