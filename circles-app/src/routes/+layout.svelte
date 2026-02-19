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
  import {
    clearSession,
    restoreSession,
    signer,
  } from '$lib/shared/state/wallet.svelte';
  import { page } from '$app/stores';
  import Send from '$lib/areas/wallet/flows/send/1_To.svelte';
  import { onDestroy, onMount } from 'svelte';
  import { tasks } from '$lib/shared/utils/tasks';
  import { popupControls, popupState } from '$lib/shared/state/popup/popUp.svelte';
  import PopUp from '$lib/shared/ui/flow/PopUp.svelte';
  import ManageGroupMembers from '$lib/areas/contacts/flows/manageGroupMembers/1_manageGroupMembers.svelte';
  import { getProfile } from '$lib/shared/data/profile/profile';
  import { initTransactionHistoryStore } from '$lib/shared/state/transactionHistory';
  import { initContactStore } from '$lib/shared/state/contacts/contacts';
  import { initBalanceStore } from '$lib/shared/state/circlesBalances';
  import { browser } from '$app/environment';
  import { PUBLIC_PLAUSIBLE_DOMAIN } from '$env/static/public';
  import { initGroupMetricsStore } from '$lib/areas/groups/state/groupMetrics.svelte';
  import { circles } from '$lib/shared/state/circles';

  import { watchAccount } from '@wagmi/core';
  import { config } from '../config';
  import WrongNetwork from '$lib/shared/ui/feedback/WrongNetwork.svelte';
  import BottomNav from '$lib/shared/ui/shell/BottomNav.svelte';
  import type { Address } from '@aboutcircles/sdk-types';
  import DefaultHeader from './DefaultHeader.svelte';
import Toast from '$lib/shared/ui/feedback/Toast.svelte';
import ConnectionRetryIndicator from '$lib/shared/ui/feedback/ConnectionRetryIndicator.svelte';
import { connectionStatus } from '$lib/shared/state/connectionStatus.svelte';

  const unwatch = watchAccount(config, {
    onChange(account) {
      const isPrivateKeySession = signer.privateKey !== undefined;

      // Wrong network guard (only when an EOA is actually present)
      if (account.chainId !== 100 && account.address) {
        popupControls.open({
          title: 'Wrong Network',
          component: WrongNetwork,
          props: {},
        });
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

  onDestroy(() => {
    unwatch();
  });

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  let menuItems: { name: string; link: string }[] = $state([]);

  onMount(() => {
    // Global handler for uncaught promise rejections (e.g., SDK WebSocket errors)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      const message = error?.message || String(error);

      // Check if it's a connection/subscription error from the SDK
      if (message.includes('Connection interrupted') ||
          message.includes('subscribe') ||
          message.includes('WebSocket') ||
          message.includes('Unauthorized')) {
        console.error('[Global] Caught unhandled SDK error:', message);
        // Prevent default browser error logging (we're handling it)
        event.preventDefault();
        // Could show a toast notification here if needed
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    if (
      $page.route.id !== '/' &&
      $page.route.id !== '/connect-wallet/connect-safe' &&
      $page.route.id !== '/connect-wallet/import-circles-garden'
    ) {
      void restoreSession();
    }

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  });

  $effect(() => {
    if (avatarState.avatar) {
      menuItems = [
        { name: 'Dashboard', link: '/dashboard' },
        {
          name: avatarState.isGroup ? 'Members' : 'Contacts',
          link: '/contacts',
        },
        ...(!avatarState.isGroup ? [{ name: 'Groups', link: '/groups' }] : []),
        { name: 'Settings', link: '/settings' },
      ];
    }
  });

  // init profile state
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

  // init stores - track which avatar we've initialized for
  let lastInitializedAvatar: string | null = null;

  $effect(() => {
    const avatar = avatarState.avatar;
    if (!avatar) return;

    // Only init when avatar address actually changes
    if (lastInitializedAvatar === avatar.address) return;
    lastInitializedAvatar = avatar.address;

    initTransactionHistoryStore(avatar);
    initContactStore(avatar);
    initBalanceStore(avatar);
    if (avatarState.isGroup && $circles) {
      initGroupMetricsStore($circles.rpc, avatar.address);
    }
  });

  // Toasts
  let hasToasts: boolean = $derived($tasks.length > 0);
</script>

<svelte:head>
  {#if browser && PUBLIC_PLAUSIBLE_DOMAIN}
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
  <div class="w-full flex flex-col items-stretch min-h-screen">
    {@render children?.()}
  </div>

  {#if avatarState.avatar}
    <BottomNav items={menuItems} />
  {/if}

  <!-- Popup backdrop with pointer events -->
  <div
    role="button"
    tabindex="0"
    class={`fixed top-0 left-0 w-full h-full bg-black/50 z-[90] ${popupState.content ? 'opacity-100' : 'opacity-0 hidden'} transition duration-300 ease-in-out pointer-events-auto`}
    style="touch-action: none;"
    onpointerdown={(e) => {
      e.stopPropagation();
      e.preventDefault();
      popupControls.close();
    }}
    onmousedown={(e) => {
      e.stopPropagation();
      e.preventDefault();
      popupControls.close();
    }}
    ontouchstart={(e) => {
      e.stopPropagation();
      e.preventDefault();
      popupControls.close();
    }}
    ontouchend={(e) => {
      e.stopPropagation();
      e.preventDefault();
      popupControls.close();
    }}
    onclick={(e) => {
      e.stopPropagation();
      e.preventDefault();
      popupControls.close();
    }}
    aria-hidden={popupState.content ? 'false' : 'true'}
  ></div>
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
