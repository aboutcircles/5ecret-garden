<script lang="ts">
  import AddressInput from '$lib/components/AddressInput.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import type { Address } from '@aboutcircles/sdk-types';
  import type { SearchResultProfile } from '@aboutcircles/sdk-rpc';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { circles } from '$lib/stores/circles';
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
  let isLoading: boolean = $state(true);
  let hasInitialized: boolean = $state(false);

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
      // New SDK: searchByAddressOrName returns ProfileSearchResponse with { results, query, searchType, totalCount }
      const response = await $circles.rpc.profile.searchByAddressOrName(
        query,
        limit,
        offset,
        avatarTypes
      );
      console.log('[SearchAvatar] searchByAddressOrName:', {
        query,
        count: response.results?.length ?? 0,
        totalCount: response.totalCount,
        firstResult: response.results?.[0],
      });
      // Log first few results to check for missing profile data
      if (response.results?.length > 0) {
        const sample = response.results.slice(0, 3);
        sample.forEach((r: any, i: number) => {
          console.log(`[SearchAvatar] Result ${i}:`, {
            address: r.address,
            name: r.name,
            previewImageUrl: r.previewImageUrl,
            avatarType: r.avatarType,
          });
        });
      }
      // Map Profile[] to SearchResultProfile[] - the results already have the needed fields
      return response.results as unknown as SearchResultProfile[];
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
        isLoading = true;
        // Use the new SDK's searchByAddressOrName which handles both address and name search
        const results = await rpcSearchByText(q, limit, 0, avatarTypes);
        result = results;
      } else {
        result = [];
      }
    } catch (error) {
      console.error('Error searching profiles:', error);
      result = [];
    } finally {
      isLoading = false;
    }
  }

  // Initial load - wait for SDK to be available before fetching
  $effect(() => {
    if (hasInitialized || !$circles) return;

    isLoading = true;
    rpcSearchByText('Circles', 25, 0, avatarTypes)
      .then((r) => {
        result = r;
      })
      .finally(() => {
        isLoading = false;
        hasInitialized = true;
      });
  });

  // Search when address changes AFTER initialization
  $effect(() => {
    if (!hasInitialized || !selectedAddress || selectedAddress === lastAddress) return;
    lastAddress = selectedAddress;
    searchProfiles();
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

  {#if isLoading}
    <div class="flex justify-center py-8">
      <span class="loading loading-spinner loading-md"></span>
    </div>
  {:else if result.length > 0}
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
              bottomInfo={avatarTypeToReadable(profile.avatarType ?? '')}
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
