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
  import {
    clearSession,
    restoreSession,
    signer,
  } from '$lib/shared/state/wallet.svelte';
  import { page } from '$app/stores';
  import { onDestroy, onMount } from 'svelte';
  import { tasks } from '$lib/shared/utils/tasks';
  import { popupControls, popupState, openFlowPopup } from '$lib/shared/state/popup/popUp.svelte';
  import PopUp from '$lib/shared/ui/flow/PopUp.svelte';
  import { getProfile } from '$lib/shared/data/profile/profile';
  import { initTransactionHistoryStore } from '$lib/shared/state/transactionHistory';
  import { initContactStore } from '$lib/shared/state/contacts/contacts';
  import { initBalanceStore } from '$lib/shared/state/circlesBalances';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { PUBLIC_PLAUSIBLE_DOMAIN } from '$env/static/public';
  import { initGroupMetricsStore } from '$lib/areas/groups/state/groupMetrics.svelte';
  import { circles } from '$lib/shared/state/circles';
  import type { Address } from '@aboutcircles/sdk-types';
  import BottomNav from '$lib/shared/ui/shell/BottomNav.svelte';
  import DefaultHeader from './DefaultHeader.svelte';
  import Banner from '$lib/shared/ui/feedback/Banner.svelte';
  import WrongNetwork from '$lib/shared/ui/feedback/WrongNetwork.svelte';
  import Toast from '$lib/shared/ui/feedback/Toast.svelte';
  import ConnectionRetryIndicator from '$lib/shared/ui/feedback/ConnectionRetryIndicator.svelte';
  import { connectionStatus } from '$lib/shared/state/connectionStatus.svelte';

  // --- Lazy wallet init ---
  let unwatch: (() => void) | null = null;
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

  async function initWalletWatcher(): Promise<void> {
    const { watchAccount } = await import('@wagmi/core');
    const { config } = await import('../config');

    unwatch = watchAccount(config, {
      onChange(account) {
        const isPrivateKeySession = signer.privateKey !== undefined;

        if (account.chainId !== 100 && account.address) {
          popupControls.open({
            title: 'Wrong Network',
            component: WrongNetwork,
            props: {},
          });
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
  });

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  let menuItems: { name: string; link: string }[] = $state([]);
  let lastAvatarAddress: string | undefined = $state(undefined);
  let hasUserInteraction = $state(false);
  const avatarInfo = $derived(avatarState.avatar?.avatarInfo ?? null);

  // --- Keyboard nav shortcuts (Ctrl/Cmd+1-4) ---
  function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    const tag = target.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select';
  }

  function handleGlobalKeydown(event: KeyboardEvent): void {
    const hasModifier = event.ctrlKey || event.metaKey;
    if (!hasModifier || isTypingTarget(event.target)) return;

    const key = event.key;
    if (!['1', '2', '3', '4'].includes(key)) return;

    const index = Number(key) - 1;
    const target = menuItems[index];
    if (!target) return;

    event.preventDefault();
    event.stopPropagation();
    void goto(target.link);
  }

  onMount(() => {
    // Global handler for uncaught promise rejections (e.g., SDK WebSocket errors)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      const message = error?.message || String(error);

      if (message.includes('Connection interrupted') ||
          message.includes('subscribe') ||
          message.includes('WebSocket') ||
          message.includes('Unauthorized')) {
        console.error('[Global] Caught unhandled SDK error:', message);
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Interaction tracking for conditional analytics
    if (browser) {
      const markInteraction = () => {
        hasUserInteraction = true;
        window.removeEventListener('pointerdown', markInteraction);
        window.removeEventListener('keydown', markInteraction);
      };
      window.addEventListener('pointerdown', markInteraction, { once: true });
      window.addEventListener('keydown', markInteraction, { once: true });

      window.addEventListener('keydown', handleGlobalKeydown);
    }

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('keydown', handleGlobalKeydown);
    };
  });

  // Lazy wallet watcher: only init when navigating away from landing/onboarding routes
  $effect(() => {
    if (!browser) return;
    if (walletWatcherInitialized || unwatch) return;

    const routeId = $page.route.id;
    if (shouldBypassWalletRestore(routeId)) return;

    walletWatcherInitialized = true;
    void initWalletWatcher();
  });

  // --- Menu items ---
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

  // --- Profile init ---
  $effect(() => {
    const address = avatarState.avatar?.address;
    if (address) {
      getProfile(address).then((newProfile) => {
        avatarState.profile = newProfile;
      });
    } else {
      avatarState.profile = undefined;
    }
  });

  // --- Store init (deduped by avatar address) ---
  let lastInitializedAvatar: string | null = null;

  $effect(() => {
    const avatar = avatarState.avatar;
    if (!avatar) return;

    if (lastInitializedAvatar === avatar.address) return;
    lastInitializedAvatar = avatar.address;

    initTransactionHistoryStore(avatar);
    initContactStore(avatar);
    initBalanceStore(avatar);
    if (avatarState.isGroup && $circles) {
      initGroupMetricsStore($circles.rpc, avatar.address);
    }
  });

  // --- Cart/auth cleanup on avatar switch ---
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

  // --- Migration popup ---
  async function openMigratePopup(): Promise<void> {
    const { default: MigrateToV2 } = await import(
      '$lib/areas/wallet/flows/migrateToV2/1_GetInvited.svelte'
    );
    openFlowPopup({
      title: 'Migrate to v2',
      component: MigrateToV2,
      props: {},
    });
  }

  // --- Toasts ---
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
  {#if avatarInfo && canMigrate(avatarInfo)}
    <button
      class="w-full fixed top-16 z-10"
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
    <div class="h-20"></div>
  {/if}

  <div class="w-full flex flex-col items-stretch min-h-screen pb-24">
    {@render children?.()}
  </div>

  {#if avatarState.avatar}
    <BottomNav items={menuItems} />
  {/if}

  <PopUp />
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

<!-- User notifications (errors, warnings, success messages) -->
<Toast />

<!-- Connection retry indicator - shows when WebSocket connections are being retried -->
{#if connectionStatus.status !== 'idle' && connectionStatus.status !== 'connected'}
  <div class="fixed top-16 left-0 right-0 z-[100] px-4 pointer-events-auto">
    <div class="max-w-md mx-auto">
      <ConnectionRetryIndicator />
    </div>
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
