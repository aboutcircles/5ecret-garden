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
  import Avatar from '$lib/components/Avatar.svelte';
  import type { ContactList } from '$lib/stores/contacts';
  import { shortenAddress } from '$lib/utils/shared';
  import type { Readable } from 'svelte/store';

  export let store:
    | Readable<{
        data: ContactList;
        next: () => Promise<boolean>;
        ended: boolean;
      }>
    | undefined = undefined;

  export let selectedAddress: string | undefined = undefined;
  export let selectedProfile: Profile | undefined = undefined;
  export let addressListTitle: string = 'Recent Addresses';
  export let noResultsMessage: string = 'No recent addresses found';

  let editorText: string | undefined = undefined;
  let inputElement: HTMLInputElement | undefined = undefined;

  const eventDispatcher = createEventDispatcher();

  $: data = $store?.data;
  $: filteredAddresses = filter(data ?? {});

  function filter(contactList: ContactList) {
    let filteredAddresses: string[] = [];

    if (selectedAddress && inputElement) {
      editorText = selectedAddress;
      inputElement.value = editorText;

      filteredAddresses = Object.keys(contactList).filter((address) => {
        return (
          address.toLowerCase().includes(editorText?.toLowerCase() ?? '') ||
          address == selectedAddress ||
          contactList[address].contactProfile.name
            ?.toLowerCase()
            ?.includes(editorText?.toLowerCase() ?? '')
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

  const handleInput = (e: any) => {
    editorText = (e.target as HTMLInputElement).value;

    if (!data) {
      throw new Error('No data available');
    }

    filteredAddresses = Object.keys(data).filter((address) => {
      return (
        address.toLowerCase().includes(editorText?.toLowerCase() ?? '') ||
        address == selectedAddress ||
        $store?.data[address].contactProfile.name
          ?.toLowerCase()
          ?.includes(editorText?.toLowerCase() ?? '')
      );
    });

    if (ethers.isAddress(editorText)) {
      selectedAddress = editorText;
      selectedProfile = $store?.data[editorText]?.contactProfile;
      selected(editorText, $store?.data[editorText]?.contactProfile);
    } else {
      selectedAddress = undefined;
      selectedProfile = undefined;
    }
  };

  // TODO: DRY
  function avatarTypeToString(
    type:
      | 'CrcV2_RegisterHuman'
      | 'CrcV2_RegisterGroup'
      | 'CrcV2_RegisterOrganization'
      | 'CrcV1_Signup'
  ): string {
    switch (type) {
      case 'CrcV2_RegisterHuman':
        return 'Human';
      case 'CrcV2_RegisterGroup':
        return 'Group';
      case 'CrcV2_RegisterOrganization':
        return 'Organization';
      case 'CrcV1_Signup':
        return 'Human (v1)';
      default:
        return 'Unknown';
    }
  }
</script>

<div class="form-control my-4">
  <input
    type="text"
    class="input input-bordered bg-gray-100"
    placeholder="Enter or search Ethereum address"
    on:input={handleInput}
    on:paste={handleInput}
    on:cut={handleInput}
    bind:this={inputElement}
  />
</div>

<p class="menu-title pl-0">
  {addressListTitle}
</p>
<div class="flex flex-col w-full divide-y gap-y-2">
  {#if Object.keys(filteredAddresses).length > 0}
    {#each filteredAddresses as address (address)}
    <div class="pt-2">
      <button
        class="flex w-full items-center justify-between p-2 bg-base-100 hover:bg-base-200 rounded-lg"
        on:click={() => {
          selectedProfile = $store?.data[address].contactProfile;
          selectedAddress = address;
          selected(address, $store?.data[address].contactProfile);
        }}
      >
        <Avatar {address} clickable={false}>
          {#if $store?.data[address].avatarInfo?.type}
            {avatarTypeToString($store?.data[address].avatarInfo?.type)} -
          {/if}
          {shortenAddress(address)}
        </Avatar>
        <div class="font-medium underline flex gap-x-2">
          See details <img
            src="/chevron-right.svg"
            alt="Chevron Right"
            class="w-4"
          />
        </div>
      </button>
    </div>
    {/each}
  {:else}
    <div class="p-2 hover:bg-base-200 rounded-lg">
      {@html noResultsMessage}
    </div>
  {/if}
</div>
