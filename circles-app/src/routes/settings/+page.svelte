<script lang="ts">
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { clearSession, wallet } from '$lib/stores/wallet.svelte';
  import { circles } from '$lib/stores/circles';
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

  // Profile editing is delegated to ProfileExplorer to keep a single flow.
  const pinApiBase = MARKET_API_BASE;
  const avatarAddress = $derived(
    (avatarState.avatar?.address ??
      avatarState.avatar?.avatarInfo?.avatar ??
      '') as Address | ''
  );

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

  type Action = { id: string; label: string; iconNode: any; onClick: () => void; variant: 'primary'|'ghost' };
  const actions: Action[] = [
    { id: 'disconnect', label: 'Disconnect', iconNode: LLogOut, onClick: clearSession, variant: 'ghost' },
  ];
</script>

<PageScaffold highlight="soft" collapsedMode="bar" collapsedHeightClass="h-12" maxWidthClass="page page--lg" contentWidthClass="page page--lg" usePagePadding={true} headerTopGapClass="mt-4 md:mt-6" collapsedTopGapClass="mt-3 md:mt-4">
  <svelte:fragment slot="title">
    <h1 class="h2">Settings</h1>
  </svelte:fragment>
  <svelte:fragment slot="meta">
    Profile, wallet, migration
  </svelte:fragment>
  <svelte:fragment slot="actions">
    {#each actions as a (a.id)}
      <button type="button" class={`btn btn-sm ${a.variant === 'primary' ? 'btn-primary' : 'btn-ghost'}`} onclick={a.onClick} aria-label={a.label}>
        <Lucide icon={a.iconNode} size={16} class={a.variant === 'primary' ? 'shrink-0 stroke-white' : 'shrink-0 stroke-black'} />
        <span>{a.label}</span>
      </button>
    {/each}
  </svelte:fragment>
    <svelte:fragment slot="collapsed-left">
  <span class="text-base md:text-lg font-semibold tracking-tight text-base-content">
      Settings
  </span>
    </svelte:fragment>
  <svelte:fragment slot="collapsed-menu">
    {#each actions as a (a.id)}
      <button type="button" class={`btn ${a.variant === 'primary' ? 'btn-primary' : 'btn-ghost'} min-h-0 h-[var(--collapsed-h)] md:h-[var(--collapsed-h-md)] w-full justify-start px-3`} onclick={a.onClick} aria-label={a.label}>
        <Lucide icon={a.iconNode} size={20} class={a.variant === 'primary' ? 'shrink-0 stroke-white' : 'shrink-0 stroke-black'} />
        <span>{a.label}</span>
      </button>
    {/each}
  </svelte:fragment>

  <div
    class="flex flex-col items-center md:border rounded-lg md:px-6 md:py-8 gap-y-4"
  >
    <div class="flex flex-col w-full gap-y-4">
      {#if avatarAddress}
        <ProfileExplorer avatar={avatarAddress} pinApiBase={pinApiBase} />
      {:else}
        <div class="p-4 text-sm opacity-70">
          Connect a Circles avatar first to edit your profile.
        </div>
      {/if}
    </div>

    {#if avatarState.isGroup}
      <div class="w-full pt-2 border-t">
        <h2 class="font-bold">Advanced Group Settings</h2>
        <GroupSetting />
      </div>
    {/if}

    {#if avatarState.avatar?.avatarInfo && canMigrate(avatarState.avatar.avatarInfo)}
      {#if avatarState.avatar?.avatarInfo?.version === 1}
        <div class="w-full pt-2 border-t">
          <h2 class="text-lg font-medium">Circles V2</h2>
          <div class="mt-3">
            <ActionButton action={migrateToV2}
              >Update to Circles V2
            </ActionButton>
          </div>
        </div>
      {/if}
      {#if avatarState.avatar?.avatarInfo?.v1Token && !avatarState.avatar?.avatarInfo?.v1Stopped}
        <div class="w-full pt-2 border-t">
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
