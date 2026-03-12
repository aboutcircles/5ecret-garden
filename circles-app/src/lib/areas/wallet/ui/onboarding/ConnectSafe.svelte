<script lang="ts">
  import type { Sdk } from '@aboutcircles/sdk';
  import { onDestroy, onMount } from 'svelte';
  import type { Address, AvatarRow } from '@aboutcircles/sdk-types';
  import type { GroupRow } from '@aboutcircles/sdk-types';
  import type { AvatarInfo } from '@aboutcircles/sdk-types';
  import ConnectCircles from '$lib/areas/wallet/ui/onboarding/ConnectCircles.svelte';
  import CreateSafe from '$lib/areas/wallet/ui/components/CreateSafe.svelte';
  import { createSafeDiscoveryStore } from '$lib/areas/wallet/data/safeDiscovery';

  let searchQuery = $state('');
  let showUnregistered = $state(false);
  let safes: Address[] = $state([]);
  let profileBySafe: Record<string, AvatarRow | undefined> = $state({});
  let groupsByOwner: Record<Address, GroupRow[]> = $state({});
  let isLoadingSafes = $state(true);
  let loadError = $state<string | null>(null);
  let loadWarning = $state<string | null>(null);

  // EOA avatar state
  let eoaAvatarInfo = $state<AvatarInfo | undefined>(undefined);
  let eoaGroups = $state<GroupRow[]>([]);
  let isLoadingEoa = $state(true);

  interface Props {
    safeOwnerAddress: Address;
    initSdk: (ownerAddress: Address) => Promise<Sdk>;
    initEoaSdk?: (eoaAddress: Address) => Promise<Sdk>;
    sdk: Sdk;
    safeCreationMode?: 'browser' | 'importedKey';
    refreshGroupsCallback?: () => void;
  }

  let {
    safeOwnerAddress,
    initSdk,
    initEoaSdk,
    sdk,
    safeCreationMode = 'browser',
    refreshGroupsCallback,
  }: Props = $props();

  // svelte-ignore state_referenced_locally — props are stable for this component's lifetime
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
    loadWarning = value.warning;
  });

  onMount(async () => {
    // Fetch Safes and EOA info in parallel
    const eoaCheck = checkEoaRegistration();
    await refresh();
    await eoaCheck;
  });

  onDestroy(() => {
    unsubscribe();
  });

  async function checkEoaRegistration() {
    try {
      const info = await sdk.data.getAvatar(safeOwnerAddress);
      if (info) {
        eoaAvatarInfo = info;
      }
    } catch {
      // EOA not registered with Circles — that's fine
    } finally {
      isLoadingEoa = false;
    }
  }

  const eoaIsRegistered = $derived(eoaAvatarInfo !== undefined);
  const eoaIsV1 = $derived(eoaAvatarInfo?.version === 1);

  async function onsafecreated(address: Address) {
    addSafe(address);
  }

  async function refreshGroupsLocal() {
    await refresh({ forceRefresh: true });
  }

  function resolveSafeName(address: Address): string {
    const row = profileBySafe[address.toLowerCase()];
    return row?.name ?? '';
  }

  function isSafeRegistered(address: Address): boolean {
    return profileBySafe[address.toLowerCase()] !== undefined;
  }

  function getFilteredSafes(): Address[] {
    const query = searchQuery.trim().toLowerCase();
    const all = safes ?? [];
    if (!query) return all;
    return all.filter((address) => {
      const name = resolveSafeName(address).toLowerCase();
      return address.toLowerCase().includes(query) || name.includes(query);
    });
  }

  const filteredSafes = $derived(getFilteredSafes());
  const registeredSafes = $derived(filteredSafes.filter(isSafeRegistered));
  const unregisteredSafes = $derived(filteredSafes.filter((a: Address) => !isSafeRegistered(a)));
  const unregisteredCount = $derived(unregisteredSafes.length);
  const unregisteredLabel = $derived(unregisteredCount === 1 ? 'Safe' : 'Safes');
</script>

<!-- Safes section -->
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
  {:else if filteredSafes.length === 0}
    <div class="rounded-xl border border-base-300 bg-base-200/40 p-4">
      <p class="text-sm text-base-content/70">
        No avatar matches &ldquo;{searchQuery.trim()}&rdquo;.
      </p>
    </div>
  {:else}
    {#if loadWarning}
      <div class="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 flex items-center gap-2">
        <p class="text-xs text-warning-content flex-1">{loadWarning}</p>
        <button class="btn btn-ghost btn-xs" type="button" onclick={() => refresh({ forceRefresh: true })}>
          Retry
        </button>
      </div>
    {/if}
    {#if registeredSafes.length > 0}
      <div class="space-y-2">
        {#each registeredSafes as item (item)}
          <ConnectCircles
            address={item}
            isRegistered={true}
            isV1={profileBySafe[item.toLowerCase()]?.version === 1}
            groups={groupsByOwner[item.toLowerCase()] ?? []}
            initSdk={initSdk}
            refreshGroupsCallback={refreshGroupsLocal}
          />
        {/each}
      </div>
    {:else if !searchQuery.trim()}
      <div class="rounded-xl border border-dashed border-base-300 bg-base-200/40 p-4">
        <p class="text-sm text-base-content/70">
          No registered Circles avatars found. Create a Safe below or reveal unregistered Safes.
        </p>
      </div>
    {/if}

    {#if unregisteredCount > 0}
      <div class="pt-2">
        <button
          type="button"
          class="btn btn-ghost btn-xs text-base-content/50"
          onclick={() => (showUnregistered = !showUnregistered)}
        >
          {showUnregistered ? 'Hide' : 'Show'} {unregisteredCount} unregistered {unregisteredLabel}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="h-4 w-4 transition-transform"
            class:rotate-180={showUnregistered}
          >
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
          </svg>
        </button>
        {#if showUnregistered}
          <div class="space-y-2 mt-2 opacity-60">
            {#each unregisteredSafes as item (item)}
              <ConnectCircles
                address={item}
                isRegistered={false}
                isV1={false}
                groups={[]}
                initSdk={initSdk}
                refreshGroupsCallback={refreshGroupsLocal}
              />
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</section>

<!-- Connected Wallet (EOA) section — shown below Safes -->
{#if !isLoadingEoa && eoaIsRegistered && initEoaSdk}
  <section class="section space-y-4">
    <div class="space-y-1">
      <h2 class="text-lg md:text-xl font-semibold tracking-tight">Connected Wallet</h2>
      <p class="text-sm text-base-content/70">
        Your wallet address is also registered with Circles.
      </p>
    </div>

    <ConnectCircles
      address={safeOwnerAddress}
      isRegistered={true}
      isV1={eoaIsV1}
      initSdk={initEoaSdk}
      label="Wallet"
      showGroups={false}
    />
  </section>
{/if}

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
