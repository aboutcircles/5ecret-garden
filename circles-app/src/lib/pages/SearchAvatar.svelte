<script lang="ts">
  import { ethers } from 'ethers';
  import { onMount } from 'svelte';
  import AddressInput from '$lib/components/AddressInput.svelte';
  import { Profiles, type SearchResultProfile } from '@circles-sdk/profiles';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { getCirclesConfig } from '$lib/utils/helpers';
  import { wallet } from '$lib/stores/wallet.svelte';
  import type { Address } from '@circles-sdk/utils';
  import { settings } from '$lib/stores/settings.svelte';

  interface Props {
    selectedAddress?: any;
    searchType?: 'send' | 'group' | 'contact';
    oninvite?: (avatar: any) => void;
    onselect?: (avatar: any) => void;
  }

  let { selectedAddress = $bindable(undefined), searchType = 'send', oninvite, onselect }: Props = $props();
  let lastAddress: string = $state('');
  let result: SearchResultProfile[] = $state([]);
  let profiles: Profiles | undefined = $state();

  //TODO: initialize profiles service at connect or restore time
  onMount(async () => {
    const network = await $wallet?.provider?.getNetwork();
    if (!network) {
      throw new Error('Failed to get network');
    }
    const circlesConfig = await getCirclesConfig(network.chainId, settings.ring);
    if (!circlesConfig.profileServiceUrl) {
      throw new Error('Profile service URL is not set');
    }
    profiles = new Profiles(circlesConfig.profileServiceUrl);

    if (searchType === 'send') {
      // TODO: implement contact list here when get profile type and circles-sdk/profiles are unified
      result = (await profiles.searchByName('a')).slice(0, 25);
    } else {
      result = (await profiles.searchByName('a')).slice(0, 25);
    }
  });

  async function searchProfiles() {
    try {
      let results: SearchResultProfile[] = [];

      // if selectedAddress is an address, add it to the results
      // as synthetic profile and prepend that profile if it's not found
      // in the search results.
      const syntheticProfile: SearchResultProfile = {
        address: selectedAddress,
        name: selectedAddress!.toString(),
        CID: '',
        lastUpdatedAt: 0,
        registeredName: null
      };

      const nameResults = await profiles?.searchByName(selectedAddress!.toString());
      if (nameResults) results = [...nameResults];
      const addressResult = await profiles?.searchByAddress(selectedAddress!.toString());
      if (addressResult) results = [...results, ...addressResult];

      // TODO: Properly type the profile. The returned values from above have an 'address' field.
      if (searchType === 'send') {
        const addressInResults = !!results.find(
          (profile: any) => profile.address === selectedAddress!.toString().toLowerCase()
        );
        if (!addressInResults && ethers.isAddress(selectedAddress)) {
          results.unshift(syntheticProfile);
        }
      }

      result = results;
    } catch (error) {
      console.error('Error searching profiles:', error);
    }
  }

  $effect(() => {
    if (selectedAddress && selectedAddress !== lastAddress) {
      lastAddress = selectedAddress;
      searchProfiles();
    } else if (selectedAddress?.toString().trim() === '') {
      if (profiles) {
        profiles.searchByName('a').then((results) => {
          result = results.slice(0, 25);
        });
      }
    }
  });
</script>

<div class="form-control my-4">
  <AddressInput bind:address={selectedAddress} />
</div>

<div class="mt-4">
  <p class="menu-title pl-0">
    {#if searchType === 'send'}
      Recipient
    {:else if searchType === 'contact'}
      Found Account
    {:else}
      Group
    {/if}
  </p>

  {#if result.length > 0}
    <div
      class="w-full md:border border-base-300 rounded-lg md:px-4 flex flex-col divide-y gap-y-2 overflow-x-auto py-4"
    >
      {#each result as profile}
        <div class="w-full pt-2">
          <button
            class="w-full flex items-center justify-between p-2 hover:bg-black/5 rounded-lg"
            onclick={() => onselect?.(profile.address as Address)}
          >
            <Avatar
              address={profile.address as Address}
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
            onclick={() => oninvite?.(selectedAddress as Address)}
            >Invite {selectedAddress}</button
          >
        {:else}
          <p>No accounts found.</p>
        {/if}
      </div>
    </div>
  {/if}
</div>
