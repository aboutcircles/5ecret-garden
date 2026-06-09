<script lang="ts">
  import type { Sdk } from '@aboutcircles/sdk';
  import { onDestroy, onMount } from 'svelte';
  import type { Address, AvatarRow } from '@aboutcircles/sdk-types';
  import type { GroupRow } from '@aboutcircles/sdk-types';
  import type { AvatarInfo } from '@aboutcircles/sdk-types';
  import ConnectCircles from '$lib/areas/wallet/ui/onboarding/ConnectCircles.svelte';
  import CreateSafe from '$lib/areas/wallet/ui/components/CreateSafe.svelte';
  import { createSafeDiscoveryStore } from '$lib/areas/wallet/data/safeDiscovery';
  import { T } from '$lib/design-system/tokens.js';

  let searchQuery = $state('');
  let showUnregistered = $state(false);
  let anyConnecting = $state(false);
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

<section style="display:flex;flex-direction:column;gap:16px;">
  <div style="display:flex;flex-direction:column;gap:4px;">
    <h2 style="font-family:{T.fontDisplay};font-size:22px;font-weight:500;color:{T.ink};letter-spacing:-0.015em;margin:0;">Safes</h2>
    <p style="font-size:13px;color:{T.inkMuted};margin:0;">
      Choose which Safe you want to use as your active avatar.
    </p>
  </div>

  <div style="border:1px solid {T.hairline};border-radius:10px;padding:10px 14px;background:{T.surface};display:flex;align-items:center;gap:8px;">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      style="width:16px;height:16px;opacity:0.6;flex-shrink:0;"
      aria-hidden="true"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35m1.1-4.4a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
    </svg>
    <input
      type="text"
      style="flex:1;min-width:0;border:0;outline:none;background:transparent;font-family:{T.fontSans};font-size:13px;color:{T.ink};"
      placeholder="Search avatar by name or address"
      bind:value={searchQuery}
      autocomplete="off"
      spellcheck="false"
    />
    {#if searchQuery.length > 0}
      <button
        type="button"
        style="border:0;background:transparent;color:{T.inkMuted};cursor:pointer;font-size:11px;padding:2px 8px;border-radius:9999px;font-family:{T.fontSans};"
        aria-label="Clear search"
        onclick={() => { searchQuery = ''; }}
      >
        Clear
      </button>
    {/if}
  </div>

  {#if isLoadingSafes}
    <div style="display:flex;flex-direction:column;gap:8px;" aria-hidden="true">
      {#each Array.from({ length: 2 }) as _}
        <div class="cs-pulse" style="height:64px;border-radius:12px;border:1px solid {T.hairlineSoft};background:{T.pageDeep};"></div>
      {/each}
    </div>
  {:else if loadError}
    <div style="border-radius:12px;border:1px solid rgba(196,68,48,0.18);background:{T.negativeSoft};padding:16px;display:flex;flex-direction:column;gap:12px;">
      <p style="font-size:13px;color:{T.negative};margin:0;">{loadError}</p>
      <button style="align-self:flex-start;height:28px;padding:0 14px;border-radius:9999px;border:1px solid {T.hairline};background:transparent;color:{T.ink};cursor:pointer;font-family:{T.fontSans};font-size:12px;" type="button" onclick={() => refresh({ forceRefresh: true })}>
        Retry
      </button>
    </div>
  {:else if (safes ?? []).length === 0}
    <div style="border-radius:12px;border:1.5px dashed {T.hairlineSoft};background:{T.pageDeep};padding:16px;">
      <p style="font-size:13px;color:{T.inkMuted};margin:0;">
        No Safe found for this wallet yet. Create one below to continue.
      </p>
    </div>
  {:else if filteredSafes.length === 0}
    <div style="border-radius:12px;border:1px solid {T.hairlineSoft};background:{T.pageDeep};padding:16px;">
      <p style="font-size:13px;color:{T.inkMuted};margin:0;">
        No avatar matches "{searchQuery.trim()}".
      </p>
    </div>
  {:else}
    {#if loadWarning}
      <div style="border-radius:10px;border:1px solid rgba(196,144,48,0.3);background:rgba(196,144,48,0.08);padding:10px 12px;display:flex;align-items:center;gap:8px;">
        <p style="font-size:12px;color:{T.warning};flex:1;margin:0;">{loadWarning}</p>
        <button style="border:0;background:transparent;font-size:12px;color:{T.inkMuted};cursor:pointer;padding:2px 8px;border-radius:6px;font-family:{T.fontSans};" type="button" onclick={() => refresh({ forceRefresh: true })}>
          Retry
        </button>
      </div>
    {/if}
    {#if registeredSafes.length > 0}
      <div style="display:flex;flex-direction:column;gap:8px;">
        {#each registeredSafes as item (item)}
          <ConnectCircles
            address={item}
            isRegistered={true}
            isV1={profileBySafe[item.toLowerCase()]?.version === 1}
            groups={groupsByOwner[item.toLowerCase()] ?? []}
            initSdk={initSdk}
            refreshGroupsCallback={refreshGroupsLocal}
            disabled={anyConnecting}
            onConnecting={(busy) => anyConnecting = busy}
          />
        {/each}
      </div>
    {:else if !searchQuery.trim()}
      <div style="border-radius:12px;border:1.5px dashed {T.hairlineSoft};background:{T.pageDeep};padding:16px;">
        <p style="font-size:13px;color:{T.inkMuted};margin:0;">
          No registered Circles avatars found. Create a Safe below or reveal unregistered Safes.
        </p>
      </div>
    {/if}

    {#if unregisteredCount > 0}
      <div style="padding-top:4px;">
        <button
          type="button"
          style="display:inline-flex;align-items:center;gap:6px;background:transparent;border:0;cursor:pointer;font-size:12px;color:{T.inkMuted};font-family:{T.fontSans};padding:4px 0;"
          onclick={() => (showUnregistered = !showUnregistered)}
        >
          {showUnregistered ? 'Hide' : 'Show'} {unregisteredCount} unregistered {unregisteredLabel}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style="width:14px;height:14px;transition:transform .15s;transform:{showUnregistered ? 'rotate(180deg)' : 'none'}">
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
          </svg>
        </button>
        {#if showUnregistered}
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;opacity:0.6;">
            {#each unregisteredSafes as item (item)}
              <ConnectCircles
                address={item}
                isRegistered={false}
                isV1={false}
                groups={[]}
                initSdk={initSdk}
                refreshGroupsCallback={refreshGroupsLocal}
                disabled={anyConnecting}
                onConnecting={(busy) => anyConnecting = busy}
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
  <section style="display:flex;flex-direction:column;gap:16px;">
    <div style="display:flex;flex-direction:column;gap:4px;">
      <h2 style="font-family:{T.fontDisplay};font-size:22px;font-weight:500;color:{T.ink};letter-spacing:-0.015em;margin:0;">Connected Wallet</h2>
      <p style="font-size:13px;color:{T.inkMuted};margin:0;">
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
      disabled={anyConnecting}
      onConnecting={(busy) => anyConnecting = busy}
    />
  </section>
{/if}

<section style="display:flex;flex-direction:column;gap:12px;">
  <div style="display:flex;flex-direction:column;gap:4px;">
    <h3 style="font-family:{T.fontSans};font-size:16px;font-weight:600;color:{T.ink};letter-spacing:-0.005em;margin:0;">Need a new Safe?</h3>
    <p style="font-size:13px;color:{T.inkMuted};margin:0;">
      Create a Safe in-app and it will appear in your list automatically.
    </p>
  </div>

  <div>
    <CreateSafe {onsafecreated} {safeCreationMode} />
  </div>
</section>

<style>
  @keyframes cs-pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
  .cs-pulse { animation: cs-pulse 1.5s ease-in-out infinite; }
</style>
