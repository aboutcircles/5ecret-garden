<script lang="ts">
  import AddressInput from '$lib/components/AddressInput.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import type { Address } from '@aboutcircles/sdk-types';
  import type { SearchResultProfile } from '@aboutcircles/sdk-rpc';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { circles } from '$lib/stores/circles';
  import { onMount } from 'svelte';
  import { ethers } from 'ethers';
  import RowFrame from '$lib/ui/RowFrame.svelte';

  interface Props {
    selectedAddress?: any;
    searchType?: 'send' | 'group' | 'contact';
    oninvite?: (avatar: any) => void;
    ontrust?: (avatar: any) => void;
    onselect?: (avatar: any) => void;
    avatarTypes?: string[];
  }

  let {
    selectedAddress = $bindable(undefined),
    searchType = 'send',
    oninvite,
    ontrust,
    onselect,
    avatarTypes,
  }: Props = $props();
  let lastAddress: string = $state('');
  let result: SearchResultProfile[] = $state([]);

  async function rpcSearchByText(
    query: string,
    limit: number,
    offset = 0,
    avatarTypes: string[] | undefined = undefined
  ): Promise<SearchResultProfile[]> {
    if (!$circles) {
      console.warn('SDK not initialized');
      return [];
    }
    try {
      return await $circles.rpc.profile.searchByAddressOrName(
        query,
        limit,
        offset,
        avatarTypes
      );
    } catch (error) {
      console.error('Error searching profiles:', error);
      return [];
    }
  }

  async function searchProfiles() {
    try {
      const q = selectedAddress?.toString() ?? '';
      const limit = 50;

      if (q.trim() !== '') {
        // Use the new SDK's searchByAddressOrName which handles both address and name search
        const results = await rpcSearchByText(q, limit, 0, avatarTypes);
        result = results;
      } else {
        result = [];
      }
    } catch (error) {
      console.error('Error searching profiles:', error);
      result = [];
    }
  }

  $effect(() => {
    if (!selectedAddress || selectedAddress.toString().trim() === '') {
      rpcSearchByText('a', 25, 0)
        .then((r) => (result = r.slice(0, 25)))
        .catch((err) => {
          console.error('Error loading default results:', err);
          result = [];
        });
    }
  });

  $effect(() => {
    if (selectedAddress && selectedAddress !== lastAddress) {
      lastAddress = selectedAddress;
      searchProfiles();
    }
  });

  onMount(async () => {
    result = await rpcSearchByText('Circles', 25, 0, avatarTypes);
  });

  function avatarTypeToReadable(type: string): string {
    if (type === 'CrcV2_RegisterHuman') return 'Human';
    if (type === 'CrcV2_RegisterGroup') return 'Group';
    if (type === 'CrcV2_RegisterOrganization') return 'Organization';
    return '';
  }
</script>

<div class="form-control my-4">
  <AddressInput bind:address={selectedAddress} />
</div>

<div class="mt-4">
  <p class="menu-title pl-0">
    {#if searchType === 'send'}Recipient{:else if searchType === 'contact'}Found
      Account{:else}Group{/if}
  </p>

  {#if result.length > 0}
    <div class="w-full flex flex-col gap-y-1.5">
      {#each result as profile}
        <RowFrame
          clickable={true}
          dense={true}
          noLeading={true}
          on:click={() => onselect && onselect(profile.address)}
        >
          <div class="min-w-0">
            <Avatar
              address={profile.address as Address}
              view="horizontal"
              bottomInfo={avatarTypeToReadable(profile.avatarType)}
              clickable={false}
            />
          </div>
          <div slot="trailing" aria-hidden="true">
            <img src="/chevron-right.svg" alt="" class="icon" />
          </div>
        </RowFrame>
      {/each}
    </div>
  {:else}
    <div class="text-center">
      <div>
        {#if ethers.isAddress(selectedAddress) && searchType === 'contact'}
          <button
            class="btn mt-6"
            onclick={() => oninvite && oninvite(selectedAddress)}
          >
            Invite {selectedAddress}
          </button>
          {#if ontrust}
            <br />
            <button
              class="btn mt-6"
              onclick={() => ontrust && ontrust(selectedAddress)}
            >
              Trust {selectedAddress}
            </button>
          {/if}
        {:else}
          <p>No accounts found.</p>
        {/if}
      </div>
    </div>
  {/if}
</div>
