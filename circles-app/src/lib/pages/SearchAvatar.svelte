<script lang="ts">
  import { ethers } from 'ethers6';
  import { createEventDispatcher, onMount } from 'svelte';
  import AddressInput from '$lib/components/AddressInput.svelte';
  import { Profiles, type Profile } from '@circles-sdk/profiles';
  import Avatar from '$lib/components/avatar/Avatar.svelte';

  export let selectedAddress: string = '';
  export let handleInvite: boolean = false;
  let lastAddress: string = '';
  let profiles = new Profiles('https://rpc.aboutcircles.com/profiles');
  let result: Profile[] = [];

  onMount(async () => {
    result = (await profiles.searchByName('a')).slice(0, 25);
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
  <p class="menu-title pl-0">Found avatars</p>

  {#if result.length > 0}
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
  {:else}
    <div class="text-center">
      <div>
        {#if ethers.isAddress(selectedAddress) && handleInvite}
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
