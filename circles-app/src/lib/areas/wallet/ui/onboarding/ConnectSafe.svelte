<script lang="ts">
  import type { AvatarRow, Sdk } from '@aboutcircles/sdk';
  import { onDestroy, onMount } from 'svelte';
  import type { Address } from '@aboutcircles/sdk-types';
  import type { GroupRow } from '@aboutcircles/sdk-types';
  import ConnectCircles from '$lib/areas/wallet/ui/onboarding/ConnectCircles.svelte';
  import CreateSafe from '$lib/areas/wallet/ui/components/CreateSafe.svelte';
  import { createSafeDiscoveryStore } from '$lib/areas/wallet/data/safeDiscovery';

  let searchQuery = $state('');
  let safes: Address[] = $state([]);
  let profileBySafe: Record<string, AvatarRow | undefined> = $state({});
  let groupsByOwner: Record<Address, GroupRow[]> = $state({});
  let isLoadingSafes = $state(true);
  let loadError = $state<string | null>(null);

  interface Props {
    safeOwnerAddress: Address;
    initSdk: (ownerAddress: Address) => Promise<Sdk>;
    sdk: Sdk;
    safeCreationMode?: 'browser' | 'importedKey';
    refreshGroupsCallback?: () => void;
  }

  let {
    safeOwnerAddress,
    initSdk,
    sdk,
    safeCreationMode = 'browser',
    refreshGroupsCallback,
  }: Props = $props();

  const { state: safeState, refresh, addSafe } = createSafeDiscoveryStore(
    safeOwnerAddress,
    sdk
  );
  const unsubscribe = safeState.subscribe((value) => {
    safes = value.safes;
    profileBySafe = value.profileBySafe;
    groupsByOwner = value.groupsByOwner;
    isLoadingSafes = value.isLoading;
    loadError = value.error;
  });

  onMount(async () => {
    await refresh();
  });

  onDestroy(() => {
    unsubscribe();
  });

  async function onsafecreated(address: Address) {
    addSafe(address);
  }

  // Refresh groups for all safes owned by this account
  async function refreshGroupsLocal() {
    await refresh({ forceRefresh: true });
  }

  function resolveSafeName(address: Address): string {
    const row = profileBySafe[address.toLowerCase()] as any;
    const candidate = row?.name ?? row?.registeredName ?? row?.profile?.name ?? '';
    return typeof candidate === 'string' ? candidate : '';
  }

  function getFilteredSafes(): Address[] {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return safes ?? [];

    return (safes ?? []).filter((address) => {
      const name = resolveSafeName(address).toLowerCase();
      return address.toLowerCase().includes(query) || name.includes(query);
    });
  }
</script>

<section class="section space-y-4">
  <div class="space-y-1">
    <h2 class="text-lg md:text-xl font-semibold tracking-tight">Safes</h2>
    <p class="text-sm text-base-content/70">
      Choose which Safe you want to use as your active avatar.
    </p>
  </div>

  <label class="form-control w-full">
    <div class="input input-bordered w-full flex items-center gap-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        class="h-4 w-4 opacity-70"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35m1.1-4.4a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
      </svg>
      <input
        type="text"
        class="grow"
        placeholder="Search avatar by name or address"
        bind:value={searchQuery}
        autocomplete="off"
        spellcheck="false"
      />
      {#if searchQuery.length > 0}
        <button
          type="button"
          class="btn btn-ghost btn-xs"
          aria-label="Clear search"
          onclick={() => {
            searchQuery = '';
          }}
        >
          Clear
        </button>
      {/if}
    </div>
  </label>

  {#if isLoadingSafes}
    <div class="space-y-2" aria-hidden="true">
      {#each Array.from({ length: 2 }) as _}
        <div class="h-16 rounded-xl border border-base-300 bg-base-200/60 animate-pulse"></div>
      {/each}
    </div>
  {:else if loadError}
    <div class="rounded-xl border border-error/30 bg-error/10 p-4 space-y-3">
      <p class="text-sm text-error">{loadError}</p>
      <button class="btn btn-sm btn-outline" type="button" onclick={() => refresh({ forceRefresh: true })}>
        Retry
      </button>
    </div>
  {:else if (safes ?? []).length === 0}
    <div class="rounded-xl border border-dashed border-base-300 bg-base-200/40 p-4">
      <p class="text-sm text-base-content/70">
        No Safe found for this wallet yet. Create one below to continue.
      </p>
    </div>
  {:else if getFilteredSafes().length === 0}
    <div class="rounded-xl border border-base-300 bg-base-200/40 p-4">
      <p class="text-sm text-base-content/70">
        No avatar matches “{searchQuery.trim()}”.
      </p>
    </div>
  {:else}
    <div class="space-y-2">
      {#each getFilteredSafes() as item (item)}
        <ConnectCircles
          address={item}
          isRegistered={profileBySafe[item.toLowerCase()] !== undefined}
          isV1={profileBySafe[item]?.version === 1}
          groups={groupsByOwner[item.toLowerCase()] ?? []}
          initSdk={initSdk}
          refreshGroupsCallback={refreshGroupsLocal}
        />
      {/each}
    </div>
  {/if}
</section>

<section class="section space-y-3">
  <div class="space-y-1">
    <h3 class="text-base md:text-lg font-semibold tracking-tight">Need a new Safe?</h3>
    <p class="text-sm text-base-content/70">
      Create a Safe in-app and it will appear in your list automatically.
    </p>
  </div>

  <div class="w-full">
    <CreateSafe {onsafecreated} {safeCreationMode} />
  </div>
 </section>
