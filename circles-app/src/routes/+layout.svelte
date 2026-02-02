<script lang="ts" module>
  export type QuickAction = {
    name: string;
    icon: string;
    action?: () => void | undefined;
  };
</script>

<script lang="ts">
  import '../app.css';

  import { avatarState } from '$lib/stores/avatar.svelte';
  import { canMigrate } from '$lib/guards/canMigrate';
  import { page } from '$app/stores';
  import { onDestroy, onMount } from 'svelte';
  import { tasks } from '$lib/utils/tasks';
  import { popupControls, popupState } from '$lib/stores/popup';
  import Popup from '$lib/components/Popup.svelte';
  import { initTransactionHistoryStore } from '$lib/stores/transactionHistory';
  import { initContactStore } from '$lib/stores/contacts';
  import { initBalanceStore } from '$lib/stores/circlesBalances';
  import { browser } from '$app/environment';
  import { PUBLIC_PLAUSIBLE_DOMAIN } from '$env/static/public';
  import { initGroupMetricsStore } from '$lib/stores/groupMetrics.svelte';
  import type { Address } from '@circles-sdk/utils';
  import { get } from 'svelte/store';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import DefaultHeader from './DefaultHeader.svelte';

  let unwatch: (() => void) | null = null;
  let walletModule: typeof import('$lib/stores/wallet.svelte') | null = null;

  async function getWalletModule() {
    if (!walletModule) {
      walletModule = await import('$lib/stores/wallet.svelte');
    }
    return walletModule;
  }

  async function initWalletWatcher(): Promise<void> {
    const { restoreSession, clearSession, signer } = await getWalletModule();
    const { watchAccount } = await import('@wagmi/core');
    const { config } = await import('../config');

    unwatch = watchAccount(config, {
      onChange(account) {
        const isPrivateKeySession = signer.privateKey !== undefined;

        // Wrong network guard (only when an EOA is actually present)
        if (account.chainId !== 100 && account.address) {
          void openWrongNetworkPopup();
          return;
        }

        // Keep signer.address in sync with the current EOA for browser sessions
        // (EOA != Safe; this is expected and NOT a reason to clear the session)
        if (!isPrivateKeySession && account.address) {
          signer.address = account.address.toLowerCase() as Address;
          return;
        }

        // For private-key sessions, mismatch means "user switched account in wallet UI"
        if (
          isPrivateKeySession &&
          signer.address &&
          account.address &&
          account.address.toLowerCase() !== signer.address.toLowerCase()
        ) {
          clearSession();
        }
      },
    });

    if (
      $page.route.id !== '/' &&
      $page.route.id !== '/connect-wallet/connect-safe' &&
      $page.route.id !== '/connect-wallet/import-circles-garden'
    ) {
      await restoreSession();
    }
  }

  onDestroy(() => {
    unwatch?.();
  });

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  let menuItems: { name: string; link: string }[] = $state([]);
  let lastAvatarAddress: string | undefined = $state(undefined);
  let hasUserInteraction = $state(false);

  onMount(async () => {
    await initWalletWatcher();
    if (browser) {
      const markInteraction = () => {
        hasUserInteraction = true;
        window.removeEventListener('pointerdown', markInteraction);
        window.removeEventListener('keydown', markInteraction);
      };
      window.addEventListener('pointerdown', markInteraction, { once: true });
      window.addEventListener('keydown', markInteraction, { once: true });
    }
  });

  async function openWrongNetworkPopup(): Promise<void> {
    const { default: WrongNetwork } = await import('$lib/components/WrongNetwork.svelte');
    popupControls.open({
      title: 'Wrong Network',
      component: WrongNetwork,
      props: {},
    });
  }

  async function openMigratePopup(): Promise<void> {
    const { default: MigrateToV2 } = await import('$lib/flows/migrateToV2/1_GetInvited.svelte');
    popupControls.open({
      title: 'Migrate to v2',
      component: MigrateToV2,
      props: {},
    });
  }

  $effect(() => {
    if (avatarState.avatar) {
      menuItems = [
        { name: 'Wallet', link: '/dashboard' },
        {
          name: avatarState.isGroup ? 'Members' : 'Contacts',
          link: '/contacts',
        },
        ...(!avatarState.isGroup ? [{ name: 'Groups', link: '/groups' }] : []),
        { name: 'Market', link: '/market' },
      ];
    }
  });

  // init profile state
  $effect(() => {
    const address = avatarState.avatar?.address;
    if (address) {
      void (async () => {
        const { getProfile } = await import('$lib/utils/profile');
        const newProfile = await getProfile(address);
        avatarState.profile = newProfile;
      })();
    } else {
      avatarState.profile = undefined;
    }
  });

  // init stores
  $effect(() => {
    if (avatarState.avatar) {
      initTransactionHistoryStore(avatarState.avatar);
      initContactStore(avatarState.avatar);
      initBalanceStore(avatarState.avatar);
      if (avatarState.groupType === 'CrcV2_BaseGroupCreated') {
        void (async () => {
          const { circles } = await import('$lib/stores/circles');
          const circlesValue = get(circles);
          if (circlesValue) {
            initGroupMetricsStore(circlesValue.circlesRpc, avatarState.avatar.address);
          }
        })();
      }
    }
  });

  $effect(() => {
    const currentAddress = avatarState.avatar?.address?.toLowerCase();
    if (lastAvatarAddress && currentAddress && lastAvatarAddress !== currentAddress) {
      void (async () => {
        const [{ PersistentAuthContext }, { clearCart }] = await Promise.all([
          import('$lib/sdk/persistentAuthContext'),
          import('$lib/cart/store'),
        ]);
        new PersistentAuthContext().clear();
        clearCart();
      })();
    }
    lastAvatarAddress = currentAddress;
  });

  // Toasts
  let hasToasts: boolean = $derived($tasks.length > 0);
</script>

<svelte:head>
  {#if browser && PUBLIC_PLAUSIBLE_DOMAIN && hasUserInteraction && avatarState.avatar}
    <script
      defer
      data-domain={PUBLIC_PLAUSIBLE_DOMAIN}
      src="https://plausible.io/js/script.js"
    ></script>
  {/if}
</svelte:head>

{#if avatarState.avatar}
  <DefaultHeader homeLink="/dashboard" />
{:else}
  <DefaultHeader homeLink="/" />
{/if}

<main
  class="relative w-full min-h-screen bg-base-200 border-gray-200 overflow-hidden font-dmSans pt-4"
>
  {#if avatarState.avatar?.avatarInfo && canMigrate(avatarState.avatar.avatarInfo)}
    <button
      class="w-full flex flex-col bg-blue-100 border-t-4 mb-4 border-blue-500 rounded-b text-blue-900 px-4 py-3 shadow-md cursor-pointer fixed top-16 z-10"
      onclick={() => void openMigratePopup()}
      onkeydown={(e) => e.key === 'Enter' && void openMigratePopup()}
    >
      <p class="font-bold">Circles V2 is here!</p>
      <p class="text-sm">Migrate your avatar to Circles V2.</p>
    </button>
    <div class="h-20"></div>
  {/if}

  <div class="w-full flex flex-col items-stretch min-h-screen pb-24">
    {@render children?.()}
  </div>

  {#if avatarState.avatar}
    <BottomNav items={menuItems} />
  {/if}

  <!-- Popup backdrop with pointer events -->
  <div
    role="button"
    tabindex="0"
    class={`fixed top-0 left-0 w-full h-full bg-black/50 z-[90] ${$popupState.content ? 'opacity-100' : 'opacity-0 hidden'} transition duration-300 ease-in-out pointer-events-auto`}
    style="touch-action: none;"
    onpointerdown={(e) => {
      e.stopPropagation();
      e.preventDefault();
      popupControls.close();
    }}
    aria-hidden={$popupState.content ? 'false' : 'true'}
  ></div>
  <Popup />
</main>
{#if hasToasts}
  <div
    class="toast toast-bottom toast-end z-[60]"
    class:layout-toast={!!avatarState.avatar}
  >
    {#each $tasks as task}
      {#if task.name == 'Error'}
        <div class="alert alert-error">
          {#await task.promise}
            <span class="loading loading-spinner loading-md"></span>
          {:then error}
            <p>{error.message}</p>
            <pre>{error.stackTrace}</pre>
          {/await}
        </div>
      {:else}
        <div class="alert bg-primary-content opacity-85">
          <span class="loading loading-spinner loading-md"></span>
          {task.name}
        </div>
      {/if}
    {/each}
  </div>
{/if}

<style>
  /* Lift toasts above BottomNav only on small screens; keep original position on md+ */
  @media (max-width: 767px) {
    :global(.layout-toast) {
      /* BottomNav uses bottom: calc(safe-area + 16px) and has a tall pill.
               96px keeps toasts comfortably above it. */
      bottom: calc(env(safe-area-inset-bottom) + 96px) !important;
    }
  }
</style>
