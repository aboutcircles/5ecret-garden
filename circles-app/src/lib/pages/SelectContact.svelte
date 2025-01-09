<script lang="ts" context="module">
  export type SelectedEvent = {
    address: string;
    profile: Profile;
  };
</script>

<script lang="ts">
  import type { Profile } from '@circles-sdk/profiles';
  import { ethers } from 'ethers6';
  import { createEventDispatcher } from 'svelte';
  import type { ContactList } from '$lib/stores/contacts';
  import { shortenAddress } from '$lib/utils/shared';
  import type { Readable } from 'svelte/store';
  import AddressInput from '$lib/components/AddressInput.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';

  export let store:
    | Readable<{
        data: ContactList;
        next: () => Promise<boolean>;
        ended: boolean;
      }>
    | undefined = undefined;

  export let selectedAddress: string | undefined = undefined;
  export let selectedProfile: Profile | undefined = undefined;
  export let addressListTitle: string = 'Recent';
  export let noResultsMessage: string = 'No recent addresses found';

  let inputElement: HTMLInputElement | undefined = undefined;

  const eventDispatcher = createEventDispatcher();

  $: data = $store?.data;
  $: filteredAddresses = filter(data ?? {});

  function filter(contactList: ContactList) {
    let filteredAddresses: string[] = [];

    if (selectedAddress && inputElement) {
      filteredAddresses = Object.keys(contactList).filter((address) => {
        return (
          address
            .toLowerCase()
            .includes(selectedAddress?.toLowerCase() ?? '') ||
          address == selectedAddress ||
          contactList[address].contactProfile.name
            ?.toLowerCase()
            ?.includes(selectedAddress?.toLowerCase() ?? '')
        );
      });
    } else {
      filteredAddresses = Object.keys(contactList);
    }

    return filteredAddresses;
  }

  function selected(address: string, profile: Profile | undefined) {
    eventDispatcher('select', <SelectedEvent>{
      address: address,
      profile: profile,
    });
  }

  function updateSearchResults() {
    filteredAddresses = Object.keys(data ?? {}).filter((address) => {
      return (
        address.toLowerCase().includes(selectedAddress?.toLowerCase() ?? '') ||
        address == selectedAddress?.toLowerCase() ||
        $store?.data[address].contactProfile.name
          ?.toLowerCase()
          ?.includes(selectedAddress?.toLowerCase() ?? '')
      );
    });

    if (ethers.isAddress(selectedAddress)) {
      // console.log(selectedAddress);
      selectedProfile = $store?.data[selectedAddress]?.contactProfile;
      selected(selectedAddress, $store?.data[selectedAddress]?.contactProfile);
    } else {
      selectedAddress = undefined;
      selectedProfile = undefined;
    }
  }

  $: if (selectedAddress) {
    // console.log("update selected address");
    updateSearchResults();
  }
</script>

<div class="form-control my-4 relative w-full">
  <AddressInput bind:address={selectedAddress} />
</div>

<p class="menu-title pl-0">
  {addressListTitle}
</p>
<div
  class="flex flex-col p-0 md:px-4 sm:py-4 w-full sm:border sm:rounded-lg overflow-x-auto divide-y"
>
  {#if Object.keys(filteredAddresses).length > 0}
    {#each filteredAddresses as address (address)}
      <button
        class="flex w-full items-center justify-between p-4 bg-base-100 hover:bg-base-200 rounded-lg"
        on:click={() => {
          selectedProfile = $store?.data[address].contactProfile;
          selectedAddress = address;
        }}
      >
        <Avatar {address} view="horizontal" clickable={false}>{shortenAddress(address)}</Avatar>
        <img src="/chevron-right.svg" alt="Chevron Right" class="w-4" />
      </button>
    {/each}
  {:else}
    <div class="p-2 hover:bg-base-200 rounded-lg">
      {@html noResultsMessage}
    </div>
  {/if}
</div>
