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
  import { fly, fade } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { tasks, completedTasks, dismissCompletedTask } from '$lib/shared/utils/tasks';
  import { gnosisscanTxUrl } from '$lib/shared/utils/explorer';
  import {
    initPopupHistorySync,
    popupControls,
    popupHistoryForwardNoopTick,
  } from '$lib/shared/state/popup';
  import Popup from '$lib/shared/ui/shell/PopupHost.svelte';
  import { initTransactionHistoryStore, transactionHistory } from '$lib/shared/state/transactionHistory';
  import { initContactStore } from '$lib/shared/state/contacts';
  import { initBalanceStore } from '$lib/shared/state/circlesBalances';
  import { browser } from '$app/environment';
  import { makeScopeId, writeMeta } from '$lib/shared/cache';
  import { env } from '$env/dynamic/public';

  const PUBLIC_PLAUSIBLE_DOMAIN = env.PUBLIC_PLAUSIBLE_DOMAIN ?? '';
  import { initGroupMetricsStore } from '$lib/areas/groups/state';
  import { circles } from '$lib/shared/state/circles';
  import type { Address } from '@aboutcircles/sdk-types';
  import BottomNav from '$lib/shared/ui/shell/BottomNav.svelte';
  import AppSidebar from '$lib/shared/ui/shell/AppSidebar.svelte';
  import DefaultHeader from './DefaultHeader.svelte';

  import Toast from '$lib/shared/ui/feedback/Toast.svelte';
  import Banner from '$lib/shared/ui/feedback/Banner.svelte';
  import ConnectionRetryIndicator from '$lib/shared/ui/feedback/ConnectionRetryIndicator.svelte';
  import { connectionStatus } from '$lib/shared/state/connectionStatus.svelte';
  import { openMigrateToV2Flow } from '$lib/areas/wallet/flows/migrateToV2/openMigrateToV2Flow';

  let unwatch: (() => void) | null = null;
  let disposePopupHistorySync: (() => void) | null = null;
  let walletModule: typeof import('$lib/shared/state/wallet.svelte') | null = null;
  let walletWatcherInitialized = false;
  // Flips to true only after initWalletWatcher() fully resolves (success or
  // failure). The auth-guard effect must wait for this before redirecting, or
  // it races against restoreSession and bounces logged-in users to "/".
  let walletRestoreCompleted = $state(false);

  function shouldBypassWalletRestore(routeId: string | null | undefined): boolean {
    if (!routeId) return true;
    return (
      routeId === '/' ||
      routeId.startsWith('/register') ||
      routeId === '/connect-wallet/connect-safe' ||
      routeId === '/connect-wallet/import-circles-garden' ||
      routeId === '/jump'
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

      // If restore completed but didn't yield an avatar, the user is not
      // logged in for this route — bounce them to the landing page.
      if (!avatarState.avatar && !shouldBypassWalletRestore($page.route.id)) {
        const { goto } = await import('$app/navigation');
        await goto('/');
      }
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

    // Legacy service-worker / cache cleanup. An old `static/service-worker.js`
    // shipped in earlier builds; it's a no-op on prod (intercepts a chiado-rpc
    // URL only) but if a user has it registered + has stale Cache API entries
    // they can serve stale chunks across deploys. Unregister + drop caches so
    // subsequent navigations always pull fresh `_app/immutable/*` from origin.
    // Fire-and-forget; never block first paint.
    if (browser && 'serviceWorker' in navigator) {
      void navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => void r.unregister()))
        .catch(() => {});
    }
    if (browser && 'caches' in window) {
      void caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => {});
    }

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

    if (browser) {
      const markInteraction = () => {
        hasUserInteraction = true;
        window.removeEventListener('pointerdown', markInteraction);
        window.removeEventListener('keydown', markInteraction);
      };
      window.addEventListener('pointerdown', markInteraction, { once: true });
      window.addEventListener('keydown', markInteraction, { once: true });
    }

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  });

  $effect(() => {
    if (!browser) return;
    if (walletWatcherInitialized || unwatch) return;

    const routeId = $page.route.id;
    if (shouldBypassWalletRestore(routeId)) {
      return;
    }

    walletWatcherInitialized = true;
    void initWalletWatcher().finally(() => {
      walletRestoreCompleted = true;
    });
  });

  // Auth guard: once the wallet watcher has initialized, if we land on a
  // protected route without an avatar (e.g. session cleared or never logged
  // in), redirect to the landing page so the user can connect.
  $effect(() => {
    if (!browser) return;
    if (!walletRestoreCompleted) return;

    const routeId = $page.route.id;
    if (shouldBypassWalletRestore(routeId)) return;

    if (!avatarState.avatar && !routeId?.startsWith('/register')) {
      void (async () => {
        const { goto } = await import('$app/navigation');
        await goto('/');
      })();
    }
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
    const address = avatarState.avatar?.address as Address | undefined;
    if (address) {
      void (async () => {
        const { getProfile } = await import('$lib/shared/utils/profile');
        const newProfile = await getProfile(address as `0x${string}`);
        avatarState.profile = newProfile;
      })();
    } else {
      avatarState.profile = undefined;
    }
  });

  // init stores - track which avatar we've initialized for
  // Hydrate from IDB cache first for instant UI, then live-fetch from RPC
  let lastInitializedAvatar: string | null = null;

  $effect(() => {
    const avatar = avatarState.avatar;
    if (!avatar) return;

    // Only init when avatar address actually changes
    if (lastInitializedAvatar === avatar.address) return;
    lastInitializedAvatar = avatar.address;

    const scopeId = makeScopeId(avatar.address);

    // NOTE: IDB hydration (stale-while-revalidate) removed — it raced with
    // the RPC-based init stores below, causing duplicate/stale data.
    // Balances: IDB resolve after RPC → overwrites fresh with stale
    // Transactions: IDB + RPC appended same rows → 3x inflated amounts
    // RPC responses are fast enough; IDB write-through still populates
    // the cache for offline/future use.

    // Init live stores (fetches from RPC, writes through to IDB)
    initTransactionHistoryStore(avatar);
    initContactStore(avatar);
    initBalanceStore(avatar);
    if (avatarState.isGroup && $circles) {
      initGroupMetricsStore($circles.rpc, avatar.address);
    }

    // 3. Update meta checkpoint
    void writeMeta({
      scopeId,
      blockNumber: 0,
      dataVersion: 1,
      lastSyncedAt: Date.now(),
    });
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

  function formatDoneName(name: string): string {
    return name.replace(/[.…\s]+$/u, '');
  }
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
<div class="flex h-dvh overflow-hidden" style="background:#EFEDE7;">

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
    <main
      class="flex-1 overflow-y-auto relative"
      style="--bottom-nav-clearance: {avatarState.avatar ? '110px' : '0px'};"
    >
      <div class="w-full flex flex-col items-stretch min-h-full md:!pb-0" style="padding-bottom: var(--bottom-nav-clearance);">
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
<div style="position:fixed;bottom:16px;right:16px;z-index:200;display:flex;flex-direction:column;gap:8px;align-items:flex-end;pointer-events:none;">
  {#each $tasks as task (task)}
    <div
      style="background:#EAE7FB;border:1px solid rgba(88,73,212,0.2);border-radius:10px;padding:12px 14px;font-size:12.5px;color:#2A1F4A;display:flex;align-items:center;gap:8px;opacity:0.85;box-shadow:0 6px 20px rgba(15,10,30,0.10);"
      in:fly={{ y: 16, duration: 240, easing: quintOut }}
      out:fade={{ duration: 160 }}
    >
      {#await task.promise}
        <svg class="layout-spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" style="width:16px;height:16px;flex-shrink:0;" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="32" stroke-dashoffset="12" stroke-linecap="round"/>
        </svg>
        {task.name}
      {:then _}
        <!-- task finished -->
      {:catch _err}
        <!-- errors handled via popup flows -->
      {/await}
    </div>
  {/each}

  {#each $completedTasks as done (done.id)}
    <div
      style="pointer-events:auto;background:#E6F4EC;border:1px solid rgba(31,138,84,0.25);border-radius:10px;padding:12px 14px;font-size:12.5px;color:#15412B;display:flex;align-items:center;gap:10px;box-shadow:0 6px 20px rgba(15,10,30,0.10);"
      in:fly={{ y: 16, duration: 240, easing: quintOut }}
      out:fade={{ duration: 160 }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" style="width:16px;height:16px;flex-shrink:0;color:#1F8A54;" aria-hidden="true">
        <path stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
      </svg>
      <div style="display:flex;flex-direction:column;gap:2px;min-width:0;">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{formatDoneName(done.name)}</span>
        {#if done.txHash}
          <a
            class="layout-toast-link"
            href={gnosisscanTxUrl(done.txHash)}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on explorer
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" style="width:11px;height:11px;" aria-hidden="true">
              <path stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M14 5h5v5M19 5l-9 9M10 5H6a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1v-4"/>
            </svg>
          </a>
        {/if}
      </div>
      <button
        type="button"
        class="layout-toast-dismiss"
        aria-label="Dismiss"
        onclick={() => dismissCompletedTask(done.id)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" style="width:13px;height:13px;" aria-hidden="true">
          <path stroke="currentColor" stroke-width="2.4" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/>
        </svg>
      </button>
    </div>
  {/each}

  {#if historyForwardNoopToastVisible}
    <div
      style="background:#EAE7FB;border:1px solid rgba(88,73,212,0.2);border-radius:10px;padding:12px 14px;font-size:12.5px;color:#2A1F4A;opacity:0.85;box-shadow:0 6px 20px rgba(15,10,30,0.10);"
      in:fly={{ y: 16, duration: 240, easing: quintOut }}
      out:fade={{ duration: 160 }}
    >
      Forward popup history is no longer available.
    </div>
  {/if}
</div>

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
  @keyframes layout-spin { to { transform: rotate(360deg); } }
  .layout-spinner { animation: layout-spin 0.8s linear infinite; color: #5849D4; }
  .layout-toast-dismiss {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    margin-left: 2px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: rgba(21, 65, 43, 0.55);
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.12s ease-out, color 0.12s ease-out;
  }
  .layout-toast-dismiss:hover {
    background: rgba(31, 138, 84, 0.14);
    color: #15412B;
  }
  .layout-toast-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    align-self: flex-start;
    font-size: 11.5px;
    font-weight: 540;
    color: #1F8A54;
    text-decoration: none;
  }
  .layout-toast-link:hover {
    text-decoration: underline;
  }
</style>
