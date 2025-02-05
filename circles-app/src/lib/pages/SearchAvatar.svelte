<script lang="ts">
  import { ethers } from 'ethers6';
  import { createEventDispatcher, onMount } from 'svelte';
  import AddressInput from '$lib/components/AddressInput.svelte';
  import { Profiles, type Profile } from '@circles-sdk/profiles';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { contacts } from '$lib/stores/contacts';

  export let selectedAddress: string = '';
  export let searchType: 'send' | 'group' | 'contact' = 'send';
  let lastAddress: string = '';
  let profiles = new Profiles('https://rpc.aboutcircles.com/profiles');
  let result: Profile[] = [];

  onMount(async () => {
    if (searchType === 'send') {
      // TODO: implement contact list here when get profile type and circles-sdk/profiles are unified

      // result = Object.values($contacts.data).map((item) => {
      //   return item.contactProfile});

      result = (await profiles.searchByName('a')).slice(0, 25);
    } else {
      result = (await profiles.searchByName('a')).slice(0, 25);
    }
  });

  async function searchProfiles() {
    try {
      let results: Profile[] = [];

      const nameResults = await profiles.searchByName(selectedAddress);
      if (nameResults) results = [...nameResults];
      const addressResult = await profiles.searchByAddress(selectedAddress);
      if (addressResult) results = [...results, ...addressResult];

      console.log('Updated results:', results);

      result = results;
    } catch (error) {
      console.error('Error searching profiles:', error);
    }
  }

  const eventDispatcher = createEventDispatcher();

  $: if (selectedAddress && selectedAddress !== lastAddress) {
    lastAddress = selectedAddress;
    searchProfiles();
  }
</script>

<div class="form-control my-4">
  <AddressInput bind:address={selectedAddress} />
</div>

<div class="mt-4">
  <p class="menu-title pl-0">
    {#if searchType === 'send'}
      Contacts
    {:else if searchType === 'contact'}
      Found Avatar
    {:else}
      Group
    {/if}
  </p>

  {#if result.length > 0}
    <div
      class="w-full md:border rounded-lg md:px-4 flex flex-col divide-y gap-y-2 overflow-x-auto py-4"
    >
      {#each result as profile}
        <div class="w-full pt-2">
          <button
            class="w-full flex items-center justify-between p-2 hover:bg-black/5 rounded-lg"
            on:click={() =>
              eventDispatcher('select', { avatar: profile.address })}
          >
            <Avatar
              address={profile.address}
              view="horizontal"
              clickable={false}
            />
            <img src="/chevron-right.svg" alt="Chevron Right" class="w-4" />
          </button>
        </div>
      {/each}
    </div>
  {:else}
    <div class="text-center">
      <div>
        {#if ethers.isAddress(selectedAddress) && searchType === 'contact'}
          <button
            class="btn mt-6"
            on:click={() =>
              eventDispatcher('invite', { avatar: selectedAddress })}
            >Invite {selectedAddress}</button
          >
        {:else}
          <p>No avatars found.</p>
        {/if}
      </div>
    </div>
  {/if}
</div>
