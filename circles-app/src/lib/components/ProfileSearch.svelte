<script lang="ts">
  /**
   * Reusable profile search component with debounced input.
   * Emits selected address when a profile is clicked.
   */
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import type { Address } from '@aboutcircles/sdk-types';
  import { searchProfiles, type ProfileSearchResult } from '$lib/utils/sdkHelpers';
  import { circles } from '$lib/stores/circles';
  import RowFrame from '$lib/ui/RowFrame.svelte';
  import { ethers } from 'ethers';

  interface Props {
    /** Placeholder text for the search input */
    placeholder?: string;
    /** Avatar types to filter by (e.g., CrcV2_RegisterHuman, CrcV2_RegisterGroup) */
    avatarTypes?: string[];
    /** Maximum results to show */
    limit?: number;
    /** Callback when a profile is selected */
    onselect?: (address: Address, profile: ProfileSearchResult) => void;
    /** Show option to use raw address if valid but not found */
    allowRawAddress?: boolean;
  }

  let {
    placeholder = 'Search by name or address...',
    avatarTypes,
    limit = 20,
    onselect,
    allowRawAddress = false,
  }: Props = $props();

  let query = $state('');
  let results = $state<ProfileSearchResult[]>([]);
  let isLoading = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const DEBOUNCE_MS = 300;

  async function performSearch(searchQuery: string) {
    if (!$circles || searchQuery.trim().length < 2) {
      results = [];
      return;
    }

    isLoading = true;
    try {
      results = await searchProfiles(
        $circles,
        searchQuery,
        limit,
        0,
        avatarTypes
      );
    } catch (error) {
      console.error('Profile search error:', error);
      results = [];
    } finally {
      isLoading = false;
    }
  }

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    query = target.value;

    // Debounce search
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      performSearch(query);
    }, DEBOUNCE_MS);
  }

  function selectProfile(profile: ProfileSearchResult) {
    if (onselect) {
      onselect(profile.address, profile);
    }
  }

  function selectRawAddress() {
    if (onselect && ethers.isAddress(query)) {
      onselect(query as Address, {
        address: query as Address,
        name: undefined,
        avatarType: undefined,
      });
    }
  }

  function avatarTypeToLabel(type: string | undefined): string {
    if (!type) return '';
    if (type === 'CrcV2_RegisterHuman') return 'Human';
    if (type === 'CrcV2_RegisterGroup') return 'Group';
    if (type === 'CrcV2_RegisterOrganization') return 'Organization';
    return '';
  }

  // Check if query is a valid address but not found in results
  const isValidAddressNotFound = $derived(
    allowRawAddress &&
    ethers.isAddress(query) &&
    results.length === 0 &&
    !isLoading
  );
</script>

<div class="w-full">
  <!-- Search input -->
  <div class="form-control">
    <div class="input input-bordered flex items-center gap-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        class="w-4 h-4 opacity-70"
      >
        <path
          fill-rule="evenodd"
          d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
          clip-rule="evenodd"
        />
      </svg>
      <input
        type="text"
        class="grow"
        {placeholder}
        value={query}
        oninput={handleInput}
      />
      {#if isLoading}
        <span class="loading loading-spinner loading-xs"></span>
      {/if}
    </div>
  </div>

  <!-- Results -->
  <div class="mt-3">
    {#if results.length > 0}
      <div class="w-full flex flex-col gap-y-1">
        {#each results as profile}
          <RowFrame
            clickable={true}
            dense={true}
            noLeading={true}
            on:click={() => selectProfile(profile)}
          >
            <div class="min-w-0">
              <Avatar
                address={profile.address}
                view="horizontal"
                bottomInfo={avatarTypeToLabel(profile.avatarType)}
                clickable={false}
              />
            </div>
            <div slot="trailing" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </RowFrame>
        {/each}
      </div>
    {:else if isValidAddressNotFound}
      <div class="text-center py-4">
        <p class="text-sm text-base-content/70 mb-2">No profile found for this address</p>
        <button
          class="btn btn-outline btn-sm"
          onclick={selectRawAddress}
        >
          Use address anyway
        </button>
      </div>
    {:else if query.length >= 2 && !isLoading}
      <p class="text-center text-base-content/70 py-4">No profiles found</p>
    {:else if query.length > 0 && query.length < 2}
      <p class="text-center text-base-content/70 py-4">Type at least 2 characters</p>
    {/if}
  </div>
</div>
