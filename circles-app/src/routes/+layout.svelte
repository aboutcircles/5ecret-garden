<script lang="ts" module>
  export type QuickAction = {
    name: string;
    icon: string;
    action?: () => void | undefined;
  };
</script>

<script lang="ts">
  import '../app.css';

  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { canMigrate } from '$lib/shared/guards/canMigrate';
  import { page } from '$app/stores';
  import { onDestroy, onMount } from 'svelte';
  import { tasks } from '$lib/shared/utils/tasks';
  import {
    initPopupHistorySync,
    popupControls,
    popupHistoryForwardNoopTick,
  } from '$lib/shared/state/popup';
  import Popup from '$lib/shared/ui/shell/PopupHost.svelte';
  import { initTransactionHistoryStore } from '$lib/shared/state/transactionHistory';
  import { initContactStore } from '$lib/shared/state/contacts';
  import { initBalanceStore } from '$lib/shared/state/circlesBalances';
  import { browser } from '$app/environment';
  import { PUBLIC_PLAUSIBLE_DOMAIN } from '$env/static/public';
  import { initGroupMetricsStore } from '$lib/areas/groups/state';
  import type { Address } from '@circles-sdk/utils';
  import { get } from 'svelte/store';
  import BottomNav from '$lib/shared/ui/shell/BottomNav.svelte';
  import AppSidebar from '$lib/shared/ui/shell/AppSidebar.svelte';
  import DefaultHeader from './DefaultHeader.svelte';
  import Banner from '$lib/shared/ui/feedback/Banner.svelte';
  import { openMigrateToV2Flow } from '$lib/areas/wallet/flows/migrateToV2/openMigrateToV2Flow';

  let unwatch: (() => void) | null = null;
  let disposePopupHistorySync: (() => void) | null = null;
  let walletModule: typeof import('$lib/shared/state/wallet.svelte') | null = null;
  let walletWatcherInitialized = false;

  function shouldBypassWalletRestore(routeId: string | null | undefined): boolean {
    if (!routeId) return true;
    return (
      routeId === '/' ||
      routeId === '/connect-wallet/connect-safe' ||
      routeId === '/connect-wallet/import-circles-garden' ||
      routeId === '/util' ||
      routeId.startsWith('/kitchen-sink')
    );
  }

  async function getWalletModule() {
    if (!walletModule) {
      walletModule = await import('$lib/shared/state/wallet.svelte');
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

        if (account.chainId !== 100 && account.address) {
          void openWrongNetworkPopup();
          return;
        }

        if (!isPrivateKeySession && account.address) {
          signer.address = account.address.toLowerCase() as Address;
          return;
        }

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

    if (!shouldBypassWalletRestore($page.route.id)) {
      await restoreSession();
    }
  }

  onDestroy(() => {
    unwatch?.();
    disposePopupHistorySync?.();
    if (historyForwardNoopToastTimer) {
      clearTimeout(historyForwardNoopToastTimer);
      historyForwardNoopToastTimer = null;
    }
  });

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  let menuItems: { name: string; link: string }[] = $state([]);
  let lastAvatarAddress: string | undefined = $state(undefined);
  let hasUserInteraction = $state(false);
  let historyForwardNoopToastVisible = $state(false);
  let lastForwardNoopTick = 0;
  let historyForwardNoopToastTimer: ReturnType<typeof setTimeout> | null = null;
  const avatarInfo = $derived(avatarState.avatar?.avatarInfo ?? null);

  onMount(() => {
    disposePopupHistorySync = initPopupHistorySync();

    if (browser) {
      const markInteraction = () => {
        hasUserInteraction = true;
        window.removeEventListener('pointerdown', markInteraction);
        window.removeEventListener('keydown', markInteraction);
      };
      window.addEventListener('pointerdown', markInteraction, { once: true });
      window.addEventListener('keydown', markInteraction, { once: true });
    }

    return undefined;
  });

  $effect(() => {
    if (!browser) return;
    if (walletWatcherInitialized || unwatch) return;

    const routeId = $page.route.id;
    if (shouldBypassWalletRestore(routeId)) {
      return;
    }

    walletWatcherInitialized = true;
    void initWalletWatcher();
  });

  async function openWrongNetworkPopup(): Promise<void> {
    const { default: WrongNetwork } = await import('$lib/areas/wallet/ui/onboarding/WrongNetwork.svelte');
    popupControls.open({
      title: 'Wrong Network',
      component: WrongNetwork,
      props: {},
    });
  }

  async function openMigratePopup(): Promise<void> {
    await openMigrateToV2Flow();
  }

  async function openSend(): Promise<void> {
    const { openSendFlowPopup } = await import('$lib/areas/wallet/flows/send/openSendFlowPopup');
    void openSendFlowPopup();
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
        const { getProfile } = await import('$lib/shared/utils/profile');
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
      const avatar = avatarState.avatar;
      initTransactionHistoryStore(avatar);
      initContactStore(avatar);
      initBalanceStore(avatar);
      if (avatarState.groupType === 'CrcV2_BaseGroupCreated') {
        void (async () => {
          const { circles } = await import('$lib/shared/state/circles');
          const circlesValue = get(circles);
          if (circlesValue) {
            initGroupMetricsStore(circlesValue.circlesRpc, avatar.address);
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
          import('$lib/shared/integrations/market'),
          import('$lib/areas/market/cart/store'),
        ]);
        new PersistentAuthContext().clear();
        clearCart();
      })();
    }
    lastAvatarAddress = currentAddress;
  });

  $effect(() => {
    const tick = $popupHistoryForwardNoopTick;
    if (tick <= 0 || tick === lastForwardNoopTick) {
      return;
    }

    lastForwardNoopTick = tick;
    historyForwardNoopToastVisible = true;

    if (historyForwardNoopToastTimer) {
      clearTimeout(historyForwardNoopToastTimer);
    }

    historyForwardNoopToastTimer = setTimeout(() => {
      historyForwardNoopToastVisible = false;
      historyForwardNoopToastTimer = null;
    }, 2200);
  });

  let hasToasts: boolean = $derived($tasks.length > 0 || historyForwardNoopToastVisible);
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

<!-- Full-height responsive shell -->
<div class="flex h-dvh overflow-hidden bg-base-200">

  <!-- Desktop sidebar (md+) -->
  {#if avatarState.avatar}
    <AppSidebar />
  {/if}

  <!-- Right side: mobile header + scrollable content + mobile bottom nav -->
  <div class="flex flex-col flex-1 min-h-0 overflow-hidden">

    <!-- Mobile header (hidden on md+, always rendered for non-avatar routes too) -->
    {#if avatarState.avatar}
      <DefaultHeader homeLink="/dashboard" />
    {:else}
      <DefaultHeader homeLink="/" />
    {/if}

    <!-- Migrate banner -->
    {#if avatarInfo && canMigrate(avatarInfo)}
      <div class="shrink-0 w-full">
        <button
          class="w-full"
          onclick={() => void openMigratePopup()}
          onkeydown={(e) => e.key === 'Enter' && void openMigratePopup()}
        >
          <Banner
            title="Circles V2 is here!"
            message="Migrate your avatar to Circles V2."
            tone="info"
            className="cursor-pointer"
          />
        </button>
      </div>
    {/if}

    <!-- Scrollable content -->
    <main class="flex-1 overflow-y-auto relative">
      <div class="w-full flex flex-col items-stretch min-h-full">
        {@render children?.()}
      </div>
    </main>

    <!-- Mobile bottom nav -->
    {#if avatarState.avatar}
      <BottomNav items={menuItems} onSend={openSend} />
    {/if}

  </div>
</div>

<!-- Popup overlay (fixed, viewport-level) -->
<Popup />

<!-- Toasts -->
{#if hasToasts}
  <div class="toast toast-bottom toast-end z-[200]">
    {#each $tasks as task}
      <div class="alert bg-primary-content opacity-85">
        {#await task.promise}
          <span class="loading loading-spinner loading-md"></span>
          {task.name}
        {:then _}
          <!-- task finished -->
        {:catch _err}
          <!-- errors handled via popup flows -->
        {/await}
      </div>
    {/each}

    {#if historyForwardNoopToastVisible}
      <div class="alert bg-primary-content opacity-85">
        Forward popup history is no longer available.
      </div>
    {/if}
  </div>
{/if}
