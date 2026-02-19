<script lang="ts">
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import SearchAvatar from '$lib/areas/contacts/ui/pages/SearchAvatar.svelte';
  import Invite from '$lib/areas/contacts/ui/pages/Invite.svelte';
  import { popupControls } from '$lib/shared/state/popup/popUp.svelte';
  import type { AddContactFlowContext } from './context';
  import ActionButton from '$lib/shared/ui/primitives/ActionButton.svelte';
  import Papa from 'papaparse';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { ethers } from 'ethers';
  import type { Address } from '@aboutcircles/sdk-types';
  import Trust from '$lib/areas/trust/ui/Trust.svelte';
  import type { BaseGroupAvatar } from '@aboutcircles/sdk';
  import { initContactStore } from '$lib/shared/state/contacts/contacts';

  let context: AddContactFlowContext = $state({
    selectedAddress: '',
  });

  let addressesArray: string[] = $state([]);
  let errorMessage = $state('');

  function oninvite(avatar: Address) {
    popupControls.open({
      title: 'Invite someone',
      component: Invite,
      props: { address: avatar },
    });
  }

  function ontrust(avatar: Address) {
    popupControls.open({
      title: 'Trust',
      component: Trust,
      props: { address: avatar },
    });
  }

  let selectedAddresses = $state('');
  async function onselect(avatar: Address) {
    const newAddress = avatar;
    const addressList = selectedAddresses.split(',').map((addr) => addr.trim());
    const alreadySelected = addressList.includes(newAddress);

    if (!alreadySelected) {
      selectedAddresses = selectedAddresses
        ? `${selectedAddresses}, ${newAddress}`
        : newAddress;
      addressesArray = [...addressesArray, newAddress];
      context.selectedAddress = '0x0';
    }
  }

  function handleErrors(error: any) {
    const userRejected =
      error?.info?.error?.code === 4001 ||
      error?.message?.includes('user rejected') ||
      error?.message?.includes('User denied transaction');

    if (userRejected) {
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

    console.log('handleAddMembers called with:', {
      addresses,
      untrust,
      isGroup: avatarState.isGroup,
      avatarType: avatarState.avatar?.constructor.name,
    });

    try {
      if (untrust) {
        console.log('Removing members/trust');
        await avatarState.avatar?.trust.remove(addresses);
      } else {
        // For groups, use the batch method with conditions for efficient processing
        if (avatarState.isGroup && avatarState.avatar) {
          console.log('Adding group members using batch method');
          // Type guard to check if this is a BaseGroupAvatar
          const groupAvatar = avatarState.avatar as BaseGroupAvatar;
          if (
            groupAvatar.trust &&
            'addBatchWithConditions' in groupAvatar.trust
          ) {
            const result = await groupAvatar.trust.addBatchWithConditions(
              addresses,
              BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFF')
            );
            console.log('Add members result:', result);
          } else {
            console.warn(
              'addBatchWithConditions not available, falling back to regular add'
            );
            await avatarState.avatar.trust.add(addresses);
          }
        } else {
          console.log('Adding members using regular add method');
          await avatarState.avatar?.trust.add(addresses);
        }
      }

      selectedAddresses = '';

      // Wait for blockchain state to update
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Refresh the contacts/members list
      if (avatarState.avatar) {
        console.log('Refreshing contacts/members list...');
        initContactStore(avatarState.avatar);
      }
    } catch (error: any) {
      console.error('Error in handleAddMembers:', error);
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
  <div class="flex items-center justify-end gap-2 pb-1">
    <div class="badge badge-ghost badge-sm">
      {addressesArray.length}
      {addressesArray.length === 1 ? ' address' : ' addresses'}
    </div>

    <button
      class="btn btn-ghost btn-circle btn-sm"
      onclick={() => {
        selectedAddresses = '';
        addressesArray = [];
      }}
      aria-label="Clear addresses"
      title="Clear addresses"
    >
      <img class="w-3 h-3" src="/x-mark.svg" alt="Clear" />
    </button>
  </div>

  <textarea
    bind:value={selectedAddresses}
    placeholder="Enter addresses separated by commas"
    rows="3"
    class="textarea textarea-bordered w-full mb-4 resize-y"
    oninput={handleAddressesChange}
  ></textarea>

  <div class="flex flex-row gap-x-2">
    <div class="flex flex-col gap-x-2">
      <div class="flex flex-row gap-x-2">
        <ActionButton action={() => handleAddMembers(selectedAddresses, false)}>
          {avatarState.isGroup ? 'Add' : 'Trust'}
        </ActionButton>

        <ActionButton action={() => handleAddMembers(selectedAddresses, true)}>
          {avatarState.isGroup ? 'Remove' : 'Untrust'}
        </ActionButton>
      </div>

      <p class="text-sm text-error h-6">{errorMessage}</p>
    </div>

    <div class="flex-grow"></div>

    <label class="btn btn-outline btn-sm cursor-pointer">
      Import CSV
      <input
        type="file"
        accept=".csv"
        class="hidden"
        onchange={handleImportCSV}
      />
    </label>
  </div>

  <p class="text-xl font-bold mt-4">
    Search for {avatarState.isGroup ? 'members' : 'contacts'}
  </p>

  <SearchAvatar
    selectedAddress={context.selectedAddress}
    {oninvite}
    {onselect}
    {ontrust}
    searchType="contact"
  />
</FlowDecoration>
