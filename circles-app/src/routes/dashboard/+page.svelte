<script lang="ts">
  import { CirclesConverter } from '@aboutcircles/sdk-utils';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { roundToDecimals } from '$lib/shared/utils/shared';
  import { runTask } from '$lib/shared/utils/tasks';

  import OverviewPanel from './OverviewPanel.svelte';
  import TransactionHistoryPanel from './TransactionHistoryPanel.svelte';
  import TrustEventsPanel from './TrustEventsPanel.svelte';
  import Tabs from '$lib/shared/ui/primitives/tabs/Tabs.svelte';
  import Tab from '$lib/shared/ui/primitives/tabs/Tab.svelte';

  import { popupControls } from '$lib/shared/state/popup/popUp.svelte';
  import Balances from '$lib/areas/wallet/ui/pages/Balances.svelte';
  import { circlesBalances } from '$lib/shared/state/circlesBalances';
  import { totalCirclesBalance } from '$lib/shared/state/totalCirclesBalance';

  import PageScaffold from '$lib/shared/ui/shell/PageScaffold.svelte';
  import Send from '$lib/areas/wallet/flows/send/1_To.svelte';
  import Profile from '$lib/areas/profile/ui/pages/Profile.svelte';

  // lucide (standalone) icon nodes
  import {
    Send as LSend,
    Banknote as LBanknote,
    BarChart3 as LBarChart3,
  } from 'lucide';
  import Lucide from '$lib/shared/ui/icons/Lucide.svelte';

  import { circles } from '$lib/shared/state/circles';
  import { refreshTransactionHistory } from '$lib/shared/state/transactionHistory';
  import { isHumanAvatar } from '$lib/shared/utils/avatarHelpers';
  import type { CirclesEvent } from '@aboutcircles/sdk-rpc';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { getGroupName } from '$lib/shared/state/groupNameCache';
  import type { Address } from '@aboutcircles/sdk-types';

  // Read transaction hash from URL for deep-linking
  let highlightTx = $derived($page.url.searchParams.get('tx') || undefined);

  // Read profile address from URL for deep-linking to profile modal
  let profileAddress = $derived($page.url.searchParams.get('profile') || undefined);

  // Track if we've already opened the profile modal (avoid re-opening on every render)
  let profileModalOpened = $state<string | null>(null);

  // Open profile modal when URL has profile param
  $effect(() => {
    if (profileAddress && profileAddress !== profileModalOpened) {
      profileModalOpened = profileAddress;
      popupControls.open({
        title: 'Profile',
        component: Profile,
        props: { address: profileAddress as Address },
        onClose: () => {
          // Clear profile param from URL when modal closes
          profileModalOpened = null;
          const url = new URL(window.location.href);
          url.searchParams.delete('profile');
          goto(url.toString(), { replaceState: true, keepFocus: true, noScroll: true });
        },
      });
    }
  });

  // Active tab for dashboard - two-way binding with Tabs via $state.
  // Synced from URL on navigation, synced to URL on user tab click.
  let activeTab: string = $state($page.url.searchParams.get('tab') || 'transactions');

  // Sync from URL → state (handles browser back/forward, deep links)
  $effect(() => {
    const urlTab = $page.url.searchParams.get('tab') || 'transactions';
    if (urlTab !== activeTab) activeTab = urlTab;
  });

  // Sync from state → URL (handles user tab clicks via bind:selected)
  $effect(() => {
    const currentUrlTab = $page.url.searchParams.get('tab') || 'transactions';
    if (activeTab === currentUrlTab) return;

    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    if (activeTab !== 'transactions') {
      url.searchParams.delete('tx');
    }
    goto(url.toString(), { replaceState: true, keepFocus: true, noScroll: true });
  });

  let mintableAmount: number = $state(0);
  let unsubscribeEvents: (() => void) | null = null;
  let txHistoryRefreshTimeout: ReturnType<typeof setTimeout> | null = null;

  // Debounced transaction history refresh to avoid multiple refreshes from the same transaction
  function refreshTransactionHistoryDebounced() {
    if (txHistoryRefreshTimeout) {
      clearTimeout(txHistoryRefreshTimeout);
    }

    txHistoryRefreshTimeout = setTimeout(async () => {
      console.log('Refreshing transaction history (debounced)...');
      // Use refreshTransactionHistory() instead of initTransactionHistoryStore()
      // The init function short-circuits when already initialized for this avatar
      await refreshTransactionHistory();
      txHistoryRefreshTimeout = null;
    }, 300); // Wait 300ms for all events from the same transaction
  }

  // Cleanup function for event subscription
  function cleanupSubscription() {
    if (unsubscribeEvents) {
      console.log('Unsubscribing from events');
      unsubscribeEvents();
      unsubscribeEvents = null;
    }
    if (txHistoryRefreshTimeout) {
      clearTimeout(txHistoryRefreshTimeout);
      txHistoryRefreshTimeout = null;
    }
  }

  // Fire-and-forget: Initialize data and subscriptions in background
  // This allows the UI to render immediately without waiting
  async function initializeAvatarInBackground() {
    if (!$circles || !avatarState.avatar) {
      return;
    }

    const avatarAddress = avatarState.avatar.address;
    if (!avatarAddress) {
      return;
    }

    try {
      // Load mintable amount for humans (non-blocking)
      if (avatarState.avatar && isHumanAvatar(avatarState.avatar)) {
        try {
          const result = await avatarState.avatar.personalToken.getMintableAmount();
          const amount = CirclesConverter.attoCirclesToCircles(result.amount);
          mintableAmount = amount ?? 0;
        } catch (error) {
          console.error('Failed to load initial mintable amount:', error);
          mintableAmount = 0;
        }
      }

      console.log(
        'Setting up event subscription for avatar (using avatar.events):',
        avatarAddress
      );

      // Subscribe to avatar's existing event stream (from auto-subscription)
      // No need to create a new WebSocket connection
      unsubscribeEvents = avatarState.avatar.events.subscribe(
        async (event: CirclesEvent) => {
          try {
            console.log('Received event:', event.$event, event);

            // Handle transaction-related events
            // Note: Balance store handles its own events automatically in +layout.svelte
            // But transaction history store needs manual refresh
            const transactionEvents = [
              'CrcV2_TransferSingle',
              'CrcV2_TransferBatch',
              'CrcV2_PersonalMint',
              'CrcV2_GroupMint',
              'CrcV2_StreamCompleted',
              'CrcV2_TransferSummary',
            ];

            if (transactionEvents.includes(event.$event)) {
              console.log('Transaction event detected:', event.$event);

              // Debounce transaction history refresh to avoid multiple refreshes
              // from the same transaction that generates multiple events
              refreshTransactionHistoryDebounced();

              // Update mintable amount for personal mints
              if (
                event.$event === 'CrcV2_PersonalMint' &&
                avatarState.avatar &&
                isHumanAvatar(avatarState.avatar)
              ) {
                try {
                  const result = await avatarState.avatar.personalToken.getMintableAmount();
                  const amount = CirclesConverter.attoCirclesToCircles(result.amount);
                  mintableAmount = amount ?? 0;
                } catch (error) {
                  console.error('Failed to update mintable amount:', error);
                }
              }
            }

            // Log other events for debugging/future features
            if (event.$event === 'CrcV2_Trust') {
              console.log('Trust event detected');
            }

            if (
              event.$event === 'CrcV2_RegisterGroup' ||
              event.$event === 'CrcV2_InviteHuman'
            ) {
              console.log('Group event detected');
            }
          } catch (error) {
            console.error('Error handling event:', error, event);
            // Don't rethrow - keep subscription alive
          }
        }
      );

      console.log('Event subscription established');
    } catch (error) {
      console.error('Failed to set up event subscription:', error);
    }
  }

  // Effect only handles cleanup and triggering initialization
  // The initialization itself runs in background without blocking
  $effect(() => {
    // Cleanup previous subscription when avatar changes
    cleanupSubscription();

    if (!$circles || !avatarState.avatar) {
      return;
    }

    // Fire-and-forget: start initialization without awaiting
    // This allows the UI to render immediately
    initializeAvatarInBackground();

    // Return cleanup function for when component is destroyed
    return () => {
      cleanupSubscription();
    };
  });

  async function mintPersonalCircles() {
    if (!avatarState.avatar || !isHumanAvatar(avatarState.avatar)) {
      throw new Error('Avatar is not a human or not available');
    }

    const humanAvatar = avatarState.avatar;

    // Set to 0 immediately for UI feedback
    mintableAmount = 0;

    // Execute mint task, then refresh transaction history and mintable amount
    try {
      await runTask({
        name: 'Minting Circles ...',
        promise: humanAvatar.personalToken.mint(),
      });

      // Mint succeeded — refresh transaction history so new tx appears immediately
      await refreshTransactionHistory();

      // Update mintable amount
      try {
        const result = await humanAvatar.personalToken.getMintableAmount();
        const amount = CirclesConverter.attoCirclesToCircles(result.amount);
        mintableAmount = amount ?? 0;
      } catch { /* ignore */ }
    } catch {
      // runTask already handles error display
    }
  }

  // Dust threshold: 0.01 CRC (same as Balances.svelte)
  const DUST_THRESHOLD = 10_000_000_000_000_000n;

  /**
   * Check if a token is a "group token" - either:
   * 1. tokenType is CrcV2_RegisterGroup (isGroup = true)
   * 2. tokenOwner is a known group (ERC20 wrapper of a group token)
   */
  function isGroupToken(balance: { isGroup: boolean; tokenOwner: Address }): boolean {
    if (balance.isGroup) return true;
    // Check if tokenOwner is a known group (from our static cache)
    const groupName = getGroupName(balance.tokenOwner);
    return !!groupName;
  }

  let personalToken: number = $derived(
    $circlesBalances?.data?.filter(
      (balance) => !isGroupToken(balance) && BigInt(balance.attoCircles) >= DUST_THRESHOLD
    )?.length ?? 0
  );
  let groupToken: number = $derived(
    $circlesBalances?.data?.filter(
      (balance) => isGroupToken(balance) && BigInt(balance.attoCircles) >= DUST_THRESHOLD
    )?.length ?? 0
  );

  function openBalances() {
    popupControls.open({
      title: 'Balance breakdown',
      component: Balances,
      props: {},
    });
  }

  function openSend() {
    popupControls.open({
      title: 'Send Circles',
      component: Send,
      props: {},
    });
  }

  // Stroke policy
  const ghostIconStrokeClass: string = 'stroke-black';
  const primaryIconStrokeClass: string = 'stroke-white';
</script>

<PageScaffold
  highlight="soft"
  maxWidthClass="page page--lg"
  contentWidthClass="page page--lg"
  usePagePadding={true}
  collapsedMode="bar"
  collapsedHeightClass="h-12"
  headerTopGapClass="mt-4 md:mt-6"
  collapsedTopGapClass="mt-3 md:mt-4"
>
  <!-- Title -->
  {#snippet title()}
    {#if !avatarState.isGroup}
      <button
        class="text-left"
        onclick={openBalances}
        aria-label="Open balances breakdown"
      >
        <h2 class="h2 m-0">
          {roundToDecimals($totalCirclesBalance)} Circles
        </h2>
      </button>
    {:else}
      <h2 class="h2 m-0">Group overview</h2>
    {/if}
  {/snippet}

  <!-- Meta -->
  {#snippet meta()}
    {#if !avatarState.isGroup}
      <button class="hover:underline inline-flex items-center gap-1" onclick={openBalances} type="button">
        <span>{personalToken + groupToken} tokens</span>
        <Lucide icon={LBarChart3} size={14} class="opacity-60" />
      </button>
    {/if}
  {/snippet}

  <!-- Full-size quick actions -->
  {#snippet actions()}
    {#if !avatarState.isGroup}
      <button type="button" class="btn btn-ghost btn-sm" onclick={openSend}>
        <Lucide
          icon={LSend}
          size={16}
          class={`shrink-0 ${ghostIconStrokeClass}`}
        />
        Send
      </button>
    {/if}

    {#if avatarState.isHuman && mintableAmount >= 0.01}
      <button
        type="button"
        class="btn btn-primary btn-sm"
        onclick={mintPersonalCircles}
      >
        <Lucide
          icon={LBanknote}
          size={16}
          class={`shrink-0 ${primaryIconStrokeClass}`}
        />
        Mint {roundToDecimals(mintableAmount)} Circles
      </button>
    {/if}
  {/snippet}

  <!-- Collapsed summary (balance only) -->
  {#snippet collapsed_left()}
    {#if !avatarState.isGroup}
      <span
        class="text-base md:text-lg font-semibold tracking-tight text-base-content"
      >
        {roundToDecimals($totalCirclesBalance)} Circles
      </span>
    {:else}
      <span
        class="text-base md:text-lg font-semibold tracking-tight text-base-content"
      >
        Group overview
      </span>
    {/if}
  {/snippet}

  <!-- Collapsed dropdown content -->
  {#snippet collapsed_menu()}
    <div class="grid grid-cols-1 gap-2">
      {#if avatarState.isHuman && mintableAmount >= 0.01}
        <button
          type="button"
          class="btn btn-primary min-h-0 h-[var(--collapsed-h)] md:h-[var(--collapsed-h-md)] justify-start px-3"
          onclick={mintPersonalCircles}
        >
          <Lucide
            icon={LBanknote}
            size={20}
            class={`shrink-0 ${primaryIconStrokeClass}`}
          />
          Mint {roundToDecimals(mintableAmount)} Circles
        </button>
      {/if}

      {#if !avatarState.isGroup}
        <button
          type="button"
          class="btn btn-ghost min-h-0 h-[var(--collapsed-h)] md:h-[var(--collapsed-h-md)] justify-start px-3"
          onclick={openSend}
        >
          <Lucide
            icon={LSend}
            size={20}
            class={`shrink-0 ${ghostIconStrokeClass}`}
          />
          Send
        </button>
      {/if}

      <button
        type="button"
        class="btn btn-ghost min-h-0 h-[var(--collapsed-h)] md:h-[var(--collapsed-h-md)] justify-start px-3"
        onclick={openBalances}
      >
        <Lucide
          icon={LBarChart3}
          size={20}
          class={`shrink-0 ${ghostIconStrokeClass}`}
        />
        See breakdown
      </button>
    </div>
  {/snippet}

  <!-- Content -->
  {#if avatarState.isGroup}
    <OverviewPanel />
  {:else}
    <div class="mb-4">
      <Tabs
        bind:selected={activeTab}
        variant="bordered"
        size="sm"
      >
        <Tab id="transactions" title="Transactions">
          <div class="pt-4">
            <TransactionHistoryPanel {highlightTx} />
          </div>
        </Tab>
        <Tab id="trusts" title="Trusts">
          <div class="pt-4">
            <TrustEventsPanel />
          </div>
        </Tab>
      </Tabs>
    </div>
  {/if}
</PageScaffold>
