<script lang="ts">
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { clearSession, wallet } from '$lib/stores/wallet.svelte';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import { canMigrate } from '$lib/guards/canMigrate';
  import MigrateToV2 from '$lib/flows/migrateToV2/1_GetInvited.svelte';
  import { popupControls } from '$lib/stores/popUp';
  import GroupSetting from './editors/GroupSetting.svelte';
  import { ethers } from 'ethers';
  import ProfileExplorer from '$lib/flows/offer/ProfileExplorer.svelte';
  import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
  import Lucide from '$lib/icons/Lucide.svelte';
  import { LogOut as LLogOut } from 'lucide';
  import { MARKET_API_BASE } from '$lib/config/market';
  import type { Address } from '@circles-sdk/utils';
  import ActionButtonDropDown from "$lib/components/layout/ActionButtonDropDown.svelte";
  import ActionButtonBar from "$lib/components/layout/ActionButtonBar.svelte";
  import type {Action} from "$lib/components/layout/Action";
  import { circles } from '$lib/stores/circles';
  import { get } from 'svelte/store';
  import { mkCirclesBindings } from '$lib/offers/mkCirclesBindings';
  import { ipfsGatewayUrl } from '$lib/utils/ipfs';

  // Profile editing is delegated to ProfileExplorer to keep a single flow.
  const pinApiBase = MARKET_API_BASE;
  const avatarAddress = $derived(
    (avatarState.avatar?.address ??
      avatarState.avatar?.avatarInfo?.avatar ??
      '') as Address | ''
  );

  // Latest profile CID for the connected avatar (if any)
  let profileCid: string | null = $state(null);
  let profileCidLoading: boolean = $state(false);
  let profileCidError: string | null = $state(null);

  async function loadProfileCid(): Promise<void> {
    profileCidLoading = true;
    profileCidError = null;
    profileCid = null;
    try {
      const sdk = get(circles);
      if (!sdk || !avatarAddress) return;
      const bindings = mkCirclesBindings(pinApiBase, sdk as any);
      profileCid = (await bindings.getLatestProfileCid(avatarAddress)) || null;
    } catch (e: any) {
      profileCidError = String(e?.message ?? e);
    } finally {
      profileCidLoading = false;
    }
  }

  $effect(() => {
    // refresh on avatar change
    void loadProfileCid();
  });

  async function copyProfileCid(): Promise<void> {
    if (!profileCid) return;
    try { await navigator.clipboard?.writeText(profileCid); } catch {}
  }

  async function migrateToV2() {
    popupControls.open({
      title: 'Migrate to v2',
      component: MigrateToV2,
      props: {},
    });
  }

  async function stopV1() {
    const v1TokenAddress = avatarState.avatar?.avatarInfo?.v1Token;
    if (!$wallet || !v1TokenAddress) {
      throw new Error('Wallet or v1 token not available');
    }

    try {
      const selector = ethers
        .keccak256(ethers.toUtf8Bytes('stop()'))
        .slice(0, 10);
      const tx = await $wallet.sendTransaction!({
        to: v1TokenAddress,
        data: selector,
        value: 0n,
      });
      console.log('Transaction sent:', tx.hash);
    } catch (error) {
      console.error('Error calling stop():', error);
    }
  }

  const actions: Action[] = [
    { id: 'disconnect', label: 'Disconnect', iconNode: LLogOut, onClick: clearSession, variant: 'ghost' },
  ];
</script>

<PageScaffold highlight="soft" collapsedMode="bar" collapsedHeightClass="h-12" maxWidthClass="page page--lg" contentWidthClass="page page--lg" usePagePadding={true} headerTopGapClass="mt-4 md:mt-6" collapsedTopGapClass="mt-3 md:mt-4">
  <svelte:fragment slot="title">
    <h1 class="h2">Settings</h1>
  </svelte:fragment>
  <svelte:fragment slot="meta">
    {#if avatarAddress}
      <span class="font-mono text-xs text-base-content/70 select-all">{avatarAddress}</span>
    {:else}
      Profile, wallet, migration
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="actions">
      <ActionButtonBar {actions} />
  </svelte:fragment>
  <svelte:fragment slot="collapsed-menu">
      <ActionButtonDropDown {actions} />
  </svelte:fragment>
  <svelte:fragment slot="collapsed-left">
    <span class="text-base md:text-lg font-semibold tracking-tight text-base-content">
      Settings
    </span>
  </svelte:fragment>
  <div
    class="flex flex-col items-center rounded-md px-3 py-4 md:px-4 md:py-5 gap-y-3"
  >
    <div class="flex flex-col w-full gap-y-4">
      {#if avatarAddress}
        <div class="w-full -mt-1 text-xs text-base-content/70 flex flex-wrap items-center gap-2">
          <span class="font-semibold">Profile CID:</span>
          {#if profileCidLoading}
            <span>loading…</span>
          {:else if profileCid}
            <span class="font-mono select-all break-all">{profileCid}</span>
            <button class="btn btn-ghost btn-xs" on:click={copyProfileCid}>Copy</button>
            <a class="link link-primary text-xs" href={ipfsGatewayUrl(profileCid)} target="_blank" rel="noopener noreferrer">Open</a>
          {:else}
            <span class="opacity-70">none yet</span>
          {/if}
        </div>
        <ProfileExplorer avatar={avatarAddress} pinApiBase={pinApiBase} showAdvancedSections={true} />
      {:else}
        <div class="p-4 text-sm opacity-70">
          Connect a Circles avatar first to edit your profile.
        </div>
      {/if}
    </div>

    {#if avatarState.isGroup}
      <div class="w-full pt-2">
        <h2 class="font-bold">Advanced Group Settings</h2>
        <GroupSetting />
      </div>
    {/if}

    {#if avatarState.avatar?.avatarInfo && canMigrate(avatarState.avatar.avatarInfo)}
      {#if avatarState.avatar?.avatarInfo?.version === 1}
        <div class="w-full pt-2">
          <h2 class="text-lg font-medium">Circles V2</h2>
          <div class="mt-3">
            <ActionButton action={migrateToV2}
              >Update to Circles V2
            </ActionButton>
          </div>
        </div>
      {/if}
      {#if avatarState.avatar?.avatarInfo?.v1Token && !avatarState.avatar?.avatarInfo?.v1Stopped}
        <div class="w-full pt-2">
          <h2 class="text-lg font-medium">Circles V1</h2>
          <div class="mt-3">
            <ActionButton action={stopV1}
              ><span class="text-orange-400">Stop V1 account permanently</span>
            </ActionButton>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</PageScaffold>
