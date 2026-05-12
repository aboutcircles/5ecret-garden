<script lang="ts">
  import type { Snippet } from 'svelte';
  import PageScaffold from '$lib/shared/ui/shell/PageScaffold.svelte';
  import Tabs from '$lib/shared/ui/primitives/tabs/Tabs.svelte';
  import Tab from '$lib/shared/ui/primitives/tabs/Tab.svelte';
  import { readable, writable } from 'svelte/store';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';

  import PersonalSection from '$lib/areas/settings/ui/sections/PersonalSection.svelte';
  import OrdersSection from '$lib/areas/settings/ui/sections/OrdersSection.svelte';
  import SalesSection from '$lib/areas/settings/ui/sections/SalesSection.svelte';
  import KeysSection from '$lib/areas/settings/ui/sections/KeysSection.svelte';
  import NamespacesSection from '$lib/areas/settings/ui/sections/NamespacesSection.svelte';
  import MarketplaceSection from '$lib/areas/settings/ui/sections/MarketplaceSection.svelte';
  import PaymentSection from '$lib/areas/settings/ui/sections/PaymentSection.svelte';
  import BookmarksSection from '$lib/areas/settings/ui/sections/BookmarksSection.svelte';

  let { children }: { children?: Snippet } = $props();

  // ——— Personal settings state/actions ———
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { clearSession, signer, wallet } from '$lib/shared/state/wallet.svelte';
  import { circles } from '$lib/shared/state/circles';
  import { openFlowPopup, popupControls } from '$lib/shared/state/popup';
  import { openMigrateToV2Flow } from '$lib/areas/wallet/flows/migrateToV2/openMigrateToV2Flow';
  import { ethers } from 'ethers';
  import { LogOut as LLogOut } from 'lucide';
  import type { Address } from '@circles-sdk/utils';
  import ActionButtonDropDown from '$lib/shared/ui/shell/ActionButtonDropDown.svelte';
  import ActionButtonBar from '$lib/shared/ui/shell/ActionButtonBar.svelte';
  import type { Action } from '$lib/shared/ui/shell/actions';
  import { getProfilesBindings } from '$lib/areas/market/offers';
  import { CirclesStorage } from '$lib/shared/utils/storage';
  import { gnosisConfig } from '$lib/shared/config/circles';
  import {
    loadNamespacesProfileForSettings,
    saveNamespacesProfileForSettings,
  } from '$lib/areas/settings/state/settingsNamespaces';
  import { fetchGatewayRowsByOwner } from '$lib/shared/data/circles/paymentGateways';
  import { openConfirmPopup, openInfoPopup } from '$lib/shared/ui/shell/confirmDialogs';

  // ——— Marketplace state/actions (connected avatar as seller) ———
  import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
  import type { AggregatedCatalogItem } from '$lib/areas/market/model';
  import OfferStep1 from '$lib/areas/market/flows/offer/1_Product.svelte';
  import { getMarketClient } from '$lib/shared/data/market/marketClientProxy';
  import { signInWithSafe } from '$lib/areas/market/auth/signin';
  import {
    getSalesBySeller,
  } from '$lib/areas/market/orders/ordersQueries';
  import {
    mapMarketSales,
    mapMarketOrderSummaries,
    type MarketSalesListItem,
    type MarketOrderSummaryListItem,
  } from '$lib/areas/market/orders/ordersMappers';
  import {
    createPagedListStore,
    createBuyerOrdersStore,
  } from '$lib/areas/market/orders/ordersStores';
  import OrderDetailsPopup from '$lib/areas/market/orders/OrderDetailsPopup.svelte';

  // ——— Payment gateways state/actions ———
  import type { GatewayRow } from '$lib/areas/settings/model/gatewayTypes';
  import type { PaginatedReadable } from '$lib/shared/state/paginatedList';
  import CreateGatewayProfile from '$lib/areas/settings/flows/gateway/CreateGatewayProfile.svelte';
  import { coerceTabId, type TabIdOf } from '$lib/shared/ui/primitives/tabs/tabId';

  const TAB_IDS = ['personal', 'bookmarks', 'orders', 'sales', 'keys', 'namespaces', 'marketplace', 'payment'] as const;
  type TabId = TabIdOf<typeof TAB_IDS>;

  let selectedTab = $state<TabId>('personal');

  $effect(() => {
    const fromUrl = $page.url.searchParams.get('tab');
    selectedTab = coerceTabId(TAB_IDS, fromUrl, 'personal');
  });


  // Canonical orders list item model from market/orders domain.
  type OrdersListItem = MarketOrderSummaryListItem;

  // Auth state must be initialized before using in $derived stores to avoid TDZ
  let ordersAuthed = $state(false);
  let salesAuthed = $state(false);

  function createStaticListStore<T>(data: T[] = []) {
    return readable({ data, next: async () => true, ended: true });
  }

  function buildOrdersAuthedStore() {
    return createBuyerOrdersStore({
      pageSize: 50,
      onOrderUpdatedWithOutbox: (snap) => {
        popupControls.open({
          title: 'Order updated',
          component: OrderDetailsPopup,
          props: { snapshot: snap },
        });
      },
    });
  }

  function buildSalesAuthedStore() {
    return createPagedListStore<MarketSalesListItem>({
      pageSize: 50,
      loadPage: async (page, pageSize) => {
        const resp = await getSalesBySeller(page, pageSize);
        const items = Array.isArray(resp?.items) ? resp.items : [];
        return mapMarketSales(items);
      },
      isEnded: (items) => items.length === 0,
    });
  }

  function buildOrdersFallbackStore() {
    return createStaticListStore<OrdersListItem>();
  }

  function buildSalesFallbackStore() {
    return createStaticListStore<MarketSalesListItem>();
  }

  const ordersStore = $derived(
    browser
      ? ordersAuthed
        ? buildOrdersAuthedStore()
        : buildOrdersFallbackStore()
      : buildOrdersFallbackStore(),
  );

  const salesStore = $derived(
    browser
      ? salesAuthed
        ? buildSalesAuthedStore()
        : buildSalesFallbackStore()
      : buildSalesFallbackStore(),
  );

  async function ensureOrdersAuthed(): Promise<void> {
    try {
      const avatar = (avatarAddress ?? '').toLowerCase();
      if (!avatar || !/^0x[a-f0-9]{40}$/.test(avatar)) {
        throw new Error('No Circles avatar address available for Safe login');
      }
      await signInWithSafe(avatar);
      ordersAuthed = !!getMarketClient().auth.getAuthMeta();
    } catch (e) {
      console.error('[settings/orders] safe sign-in failed:', e);
      ordersAuthed = false;
    }
  }

  async function ensureSalesAuthed(): Promise<void> {
    try {
      const avatar = (avatarAddress ?? '').toLowerCase();
      if (!avatar || !/^0x[a-f0-9]{40}$/.test(avatar)) {
        throw new Error('No Circles avatar address available for Safe login');
      }
      await signInWithSafe(avatar);
      salesAuthed = !!getMarketClient().auth.getAuthMeta();
    } catch (e) {
      console.error('[settings/sales] safe sign-in failed:', e);
      salesAuthed = false;
    }
  }

  // ——— Shared / personal derived state ———
  const avatarAddress = $derived(
    (avatarState.avatar?.address ?? avatarState.avatar?.avatarInfo?.avatar ?? '') as Address | '',
  );

  const headerTitle = $derived(avatarState.profile?.name?.trim() || 'Settings');

  // Profile editing is delegated to ProfileExplorer to keep a single flow.
  const pinApiBase = gnosisConfig.production.profilePinningServiceUrl;

  // Latest profile CID for the connected avatar (if any)
  let profileCid: string | null = $state(null);
  let profileCidLoading: boolean = $state(false);
  let profileCidError: string | null = $state(null);

  async function loadProfileCid(): Promise<void> {
    profileCidLoading = true;
    profileCidError = null;
    profileCid = null;
    try {
      if (!avatarAddress) return;
      const { bindings } = getProfilesBindings({ pinApiBase });
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
    try {
      await navigator.clipboard?.writeText(profileCid);
    } catch {}
  }

  // ——— Namespaces (extracted from ProfileExplorer “Namespaces” panel) ———
  let nsLoading: boolean = $state(false);
  let nsError: string | null = $state(null);
  let nsResolvedAvatar: Address | null = $state(null);
  let nsNamespaces: Record<string, string> = $state({});

  const connectedAvatarLower = $derived(
    (avatarState.avatar?.address ?? avatarState.avatar?.avatarInfo?.avatar ?? '').toLowerCase(),
  );
  const nsAvatarLower = $derived((nsResolvedAvatar ?? '').toLowerCase());
  const nsIsOwner = $derived(
    !!connectedAvatarLower && !!nsAvatarLower && connectedAvatarLower === nsAvatarLower,
  );

  async function loadNamespacesProfile(): Promise<void> {
    nsLoading = true;
    nsError = null;
    nsResolvedAvatar = null;
    nsNamespaces = {};

    try {
      const loaded = await loadNamespacesProfileForSettings({
        avatarAddress,
        pinApiBase,
      });
      nsResolvedAvatar = loaded.resolvedAvatar;
      nsNamespaces = loaded.namespaces;
    } catch (e: any) {
      nsError = String(e?.message ?? e);
    } finally {
      nsLoading = false;
    }
  }

  $effect(() => {
    // Load namespaces only when the Namespaces tab is visible.
    if (selectedTab !== 'namespaces') return;
    void loadNamespacesProfile();
  });

  function onNamespacesChanged(e: CustomEvent<Record<string, string>>): void {
    nsNamespaces = e.detail;
    if (nsIsOwner) {
      void saveNamespacesProfile();
    }
  }

  async function saveNamespacesProfile(): Promise<void> {
    if (!nsResolvedAvatar) return;
    if (!nsIsOwner) return;
    await saveNamespacesProfileForSettings({
      resolvedAvatar: nsResolvedAvatar,
      namespaces: nsNamespaces,
      pinApiBase,
    });
  }

  async function migrateToV2() {
    await openMigrateToV2Flow();
  }

  async function stopV1() {
    const v1TokenAddress = avatarState.avatar?.avatarInfo?.v1Token;
    if (!$wallet || !v1TokenAddress) {
      throw new Error('Wallet or v1 token not available');
    }

    try {
      const selector = ethers.keccak256(ethers.toUtf8Bytes('stop()')).slice(0, 10);
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

  // Delete only the locally stored private key (seed-derived). Keeps current session unless you disconnect.
  async function deleteLocalKey(): Promise<void> {
    try {
      const confirmDelete = await openConfirmPopup({
        title: 'Delete local key',
        message:
          'Delete the Circles magic words (private key) from this device? You will need to import them again next time you connect.',
      });
      if (!confirmDelete) return;
      CirclesStorage.getInstance().data = { privateKey: undefined };
      // Drop in-memory reference too
      try {
        (signer as any).privateKey = undefined;
      } catch {}
      await openInfoPopup({
        title: 'Key deleted',
        message: 'Local key deleted from this device. You remain connected until you disconnect.',
        tone: 'success',
      });
    } catch (e) {
      console.error('Failed to delete local key', e);
      await openInfoPopup({
        title: 'Delete failed',
        message: 'Failed to delete key. See console for details.',
        tone: 'error',
      });
    }
  }

  // ——— Marketplace seller data for connected avatar ———
  type ProductLike = AggregatedCatalogItem;
  let marketLoading: boolean = $state(false);
  let marketErrorMsg: string = $state('');
  let marketProducts: ProductLike[] = $state([]);

  async function loadSellerCatalog(): Promise<void> {
    marketLoading = true;
    marketErrorMsg = '';
    marketProducts = [];

    try {
      if (!avatarAddress) {
        marketLoading = false;
        return;
      }
      const normalized = normalizeAddress(avatarAddress);

      const catalog = getMarketClient().catalog.forOperator(gnosisConfig.production.marketOperator);
      const items = await catalog.fetchSellerCatalog(normalized);
      // fetchSellerCatalog already filters by seller, but keep this defensive filter
      marketProducts = items.filter((p) => (p.seller ?? '').toLowerCase() === normalized.toLowerCase());
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : 'Unknown error';
      marketErrorMsg = msg;
    } finally {
      marketLoading = false;
    }
  }

  $effect(() => {
    // only load when the Marketplace tab is visible
    if (selectedTab !== 'marketplace') return;
    void loadSellerCatalog();
  });

  function openCreateListing() {
    openFlowPopup({
      title: 'Create Offer',
      component: OfferStep1,
      props: {
        context: {
          operator: gnosisConfig.production.marketOperator,
          pinApiBase: gnosisConfig.production.profilePinningServiceUrl,
        },
      },
      onClose: () => {
        void loadSellerCatalog();
      },
    });
  }

  const actionsPersonal: Action[] = [
    {
      id: 'disconnect',
      label: 'Disconnect',
      iconNode: LLogOut,
      onClick: clearSession,
      variant: 'ghost',
    },
  ];

  const actionsMarketplace: Action[] = [
    {
      id: 'create-offer',
      label: 'Create Listing',
      variant: 'primary',
      onClick: openCreateListing,
    },
    ...actionsPersonal,
  ];

  const actionsOrders: Action[] = $derived([
    {
      id: 'signin-orders',
      label: ordersAuthed ? 'Signed in' : 'Sign in to view all orders',
      variant: ordersAuthed ? 'ghost' : 'primary',
      onClick: () => {
        if (!ordersAuthed) void ensureOrdersAuthed();
      },
    },
    ...actionsPersonal,
  ]);

  const actionsSales: Action[] = $derived([
    {
      id: 'signin-sales',
      label: salesAuthed ? 'Signed in' : 'Sign in to view all sales',
      variant: salesAuthed ? 'ghost' : 'primary',
      onClick: () => {
        if (!salesAuthed) void ensureSalesAuthed();
      },
    },
    ...actionsPersonal,
  ]);

  const headerActions = $derived(
    selectedTab === 'marketplace'
      ? actionsMarketplace
      : selectedTab === 'orders'
        ? actionsOrders
        : selectedTab === 'sales'
          ? actionsSales
          : selectedTab === 'payment'
            ? actionsPayment
            : actionsPersonal,
  );

  if (browser) {
    ordersAuthed = !!getMarketClient().auth.getAuthMeta();
    salesAuthed = ordersAuthed;
  }

  // ——— Payment gateways list store ———
  const myGatewaysStoreInner = writable<{ data: GatewayRow[]; next: () => Promise<boolean>; ended: boolean }>({
    data: [],
    next: async () => true,
    ended: true,
  });

  const myGatewaysStore: PaginatedReadable<GatewayRow> = {
    subscribe: myGatewaysStoreInner.subscribe,
  };

  let loadingGateways: boolean = $state(false);

  const gatewayOwnerAddress = $derived(avatarAddress as Address | '');
  const shortGatewayAddr = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');

  async function loadMyGateways(): Promise<void> {
    if (!gatewayOwnerAddress || !$circles?.circlesRpc) {
      myGatewaysStoreInner.set({
        data: [],
        next: async () => true,
        ended: true,
      });
      return;
    }

    try {
      loadingGateways = true;
      const rowsMapped: GatewayRow[] = await fetchGatewayRowsByOwner($circles, gatewayOwnerAddress);

      myGatewaysStoreInner.set({
        data: rowsMapped,
        next: async () => true,
        ended: true,
      });
    } catch (e) {
      console.error('loadMyGateways', e);
      myGatewaysStoreInner.set({
        data: [],
        next: async () => true,
        ended: true,
      });
    } finally {
      loadingGateways = false;
    }
  }

  $effect(() => {
    // Load gateways only when the Payment tab is visible.
    if (selectedTab !== 'payment') return;
    if (gatewayOwnerAddress && $circles?.circlesRpc) {
      void loadMyGateways();
    } else {
      myGatewaysStoreInner.set({
        data: [],
        next: async () => true,
        ended: true,
      });
    }
  });

  function openCreateGatewayFlow() {
    openFlowPopup({
      title: 'Create payment gateway',
      component: CreateGatewayProfile,
      props: {
        onCreated: async () => {
          await loadMyGateways();
        },
      },
    });
  }

  const actionsPayment: Action[] = [
    {
      id: 'create-gateway',
      label: 'Create gateway',
      variant: 'primary',
      onClick: openCreateGatewayFlow,
    },
    ...actionsPersonal,
  ];
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
  {#snippet title()}
    <h1 class="h2">{headerTitle}</h1>
  {/snippet}

  {#snippet meta()}
    {#if avatarAddress}
      <span class="font-mono text-xs text-base-content/70 select-all">{avatarAddress}</span>
    {:else}
      Profile, wallet, marketplace
    {/if}
  {/snippet}

  {#snippet headerActions()}
    <ActionButtonBar actions={headerActions} />
  {/snippet}

  {#snippet collapsedMenu()}
    <ActionButtonDropDown actions={headerActions} />
  {/snippet}

  {#snippet collapsedLeft()}
    <span class="text-base md:text-lg font-semibold tracking-tight text-base-content">
      {headerTitle}
    </span>
  {/snippet}

  <div class="flex flex-col items-center rounded-md px-3 py-4 md:px-4 md:py-5 gap-y-3">
    <div class="w-full">
      <Tabs bind:selected={selectedTab} variant="boxed" size="sm">
        <Tab id="personal" title="Profile" />
        <Tab id="bookmarks" title="Bookmarks" />
        <Tab id="orders" title="Orders" />
        <Tab id="sales" title="Sales" />
        <Tab id="marketplace" title="Offers" />
        <Tab id="payment" title="Payment gateways" />
        <Tab id="namespaces" title="Applications" />
        <Tab id="keys" title="Signing keys" />
      </Tabs>
    </div>

    <div class="flex flex-col w-full gap-y-4">
      {#if selectedTab === 'personal'}
        <PersonalSection
          {avatarAddress}
          {avatarState}
          {pinApiBase}
          {profileCid}
          {profileCidLoading}
          {profileCidError}
          {copyProfileCid}
          {migrateToV2}
          {stopV1}
        />
      {:else if selectedTab === 'bookmarks'}
        <BookmarksSection />
      {:else if selectedTab === 'orders'}
        <OrdersSection
          {avatarAddress}
          {ordersAuthed}
          {ensureOrdersAuthed}
          {ordersStore}
        />
      {:else if selectedTab === 'sales'}
        <SalesSection
          {avatarAddress}
          {salesAuthed}
          {ensureSalesAuthed}
          salesStore={salesStore}
        />
      {:else if selectedTab === 'keys'}
        <KeysSection {avatarAddress} {pinApiBase} {deleteLocalKey} />
      {:else if selectedTab === 'namespaces'}
        <NamespacesSection
          {avatarAddress}
          {pinApiBase}
          {nsError}
          {nsLoading}
          {nsResolvedAvatar}
          {nsNamespaces}
          {nsIsOwner}
          {onNamespacesChanged}
        />
      {:else if selectedTab === 'marketplace'}
        <MarketplaceSection
          {avatarAddress}
          {marketLoading}
          {marketErrorMsg}
          marketProducts={marketProducts}
          {openCreateListing}
          {loadSellerCatalog}
        />
      {:else if selectedTab === 'payment'}
        <PaymentSection
          {gatewayOwnerAddress}
          circlesReady={!!$circles}
          {loadingGateways}
          {myGatewaysStore}
          {shortGatewayAddr}
          onReloadGateways={loadMyGateways}
        />
      {:else}
        <div class="p-4 text-sm opacity-70">Select a tab.</div>
      {/if}

      {@render children?.()}
    </div>
  </div>
</PageScaffold>