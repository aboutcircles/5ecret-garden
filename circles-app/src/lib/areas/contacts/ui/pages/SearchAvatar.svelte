<script lang="ts">
  import AddressInput from '$lib/shared/ui/forms/AddressInput.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import type { Address } from '@aboutcircles/sdk-types';
  import type { ProfileSearchResult as SearchResultProfile } from '$lib/shared/utils/sdkHelpers';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { circles } from '$lib/shared/state/circles';
  import { contacts } from '$lib/shared/state/contacts/contacts';
  import { ethers } from 'ethers';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';

  interface Props {
    selectedAddress?: any;
    searchType?: 'send' | 'group' | 'contact' | 'global';
    oninvite?: (avatar: any) => void;
    ontrust?: (avatar: any) => void;
    onselect?: (avatar: any) => void;
    avatarTypes?: string[];
    inputDataAttribute?: string;
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
      // searchByAddressOrName may return ProfileSearchResponse { results } or SearchResultProfile[]
      // depending on SDK version resolution — handle both shapes
      const raw: any = await $circles.rpc.profile.searchByAddressOrName(
        query,
        limit,
        offset,
        avatarTypes
      );
      const results: any[] = Array.isArray(raw) ? raw : (raw.results || []);
      return results
        .map((r: any) => {
          // Address is stored as key in namespaces object
          const address = r.address || (r.namespaces ? Object.keys(r.namespaces)[0] : undefined);
          return {
            ...r,
            address,
            // Normalize image field
            previewImageUrl: r.previewImageUrl || r.imageUrl,
          };
        })
        .filter((r: any) => r.address) as SearchResultProfile[];
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

  // Initial load - for 'send', show trusted contacts as default recipients
  // For other search types, do a generic search
  $effect(() => {
    if (hasInitialized || !$circles) return;

    if (searchType === 'send' && $contacts?.data) {
      // Use the already-loaded contacts as default recipient list
      const contactList = Object.values($contacts.data);
      if (contactList.length > 0) {
        result = contactList.map((c) => ({
          address: c.row.objectAvatar as Address,
          name: c.contactProfile?.name || c.row.objectAvatar,
          previewImageUrl: c.contactProfile?.previewImageUrl,
          avatarType: c.avatarInfo?.type,
        })) as unknown as SearchResultProfile[];
        isLoading = false;
        hasInitialized = true;
        return;
      }
    }

    isLoading = true;
    rpcSearchByText('', 25, 0, avatarTypes)
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
          onclick={() => onselect && onselect(profile.address)}
        >
          <div class="min-w-0">
            <Avatar
              address={profile.address as Address}
              view="horizontal"
              bottomInfo={avatarTypeToReadable(profile.avatarType ?? '')}
              clickable={false}
            />
          </div>
          {#snippet trailing()}
            <div aria-hidden="true">
              <img src="/chevron-right.svg" alt="" class="icon" />
            </div>
          {/snippet}
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
