<script lang="ts">
  import {ethers} from 'ethers6';
  import {createEventDispatcher, onMount} from 'svelte';
  import AddressInput from '$lib/components/AddressInput.svelte';
  import {type Profile, Profiles} from '@circles-sdk/profiles';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import {getCirclesConfig} from "$lib/utils/helpers";
  import {wallet} from "$lib/stores/wallet";

  export let selectedAddress: string = '';
  export let searchType: 'send' | 'group' | 'contact' = 'send';
  let lastAddress: string = '';
  let result: Profile[] = [];
  let profiles: Profiles | undefined;

  onMount(async () => {
    const network = await $wallet?.provider?.getNetwork();
    if (!network) {
      throw new Error('Failed to get network');
    }
    const circlesConfig = await getCirclesConfig(network.chainId);
    if (!circlesConfig.profileServiceUrl) {
      throw new Error('Profile service URL is not set');
    }
    profiles = new Profiles(circlesConfig.profileServiceUrl);

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

      // if selectedAddress is an address, add it to the results
      // as synthetic profile and prepend that profile if it's not found
      // in the search results.
      const syntheticProfile = {
        address: selectedAddress,
        name: selectedAddress,
        avatar: '',
        bio: ''
      };

      const nameResults = await profiles?.searchByName(selectedAddress);
      if (nameResults) results = [...nameResults];
      const addressResult = await profiles?.searchByAddress(selectedAddress);
      if (addressResult) results = [...results, ...addressResult];

      // TODO: Properly type the profile. The returned values from above have an 'address' field.
      if (searchType === 'send') {
        const addressInResults = !!results.find((profile: any) => profile.address === selectedAddress);
        if (!addressInResults && ethers.isAddress(selectedAddress)) {
          results.unshift(syntheticProfile);
        }
      }

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
  } else if (selectedAddress.trim() === '') {
    if (profiles) {
      profiles.searchByName('a').then(results => {
        result = results.slice(0, 25);
      });
    }
  }
</script>

<div class="form-control my-4">
  <AddressInput bind:address={selectedAddress}/>
</div>

<div class="mt-4">
  <p class="menu-title pl-0">
    {#if searchType === 'send'}
      Recipient
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
            <img src="/chevron-right.svg" alt="Chevron Right" class="w-4"/>
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
