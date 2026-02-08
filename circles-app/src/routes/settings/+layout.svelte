<script lang="ts">
  import type { Snippet } from 'svelte';
  import PageScaffold from '$lib/app/shell/PageScaffold.svelte';
  import Tabs from '$lib/shared/ui/primitives/tabs/Tabs.svelte';
  import Tab from '$lib/shared/ui/primitives/tabs/Tab.svelte';
  import { writable, type Readable } from 'svelte/store';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';

  import PersonalSection from './sections/PersonalSection.svelte';
  import OrdersSection from './sections/OrdersSection.svelte';
  import SalesSection from './sections/SalesSection.svelte';
  import KeysSection from './sections/KeysSection.svelte';
  import NamespacesSection from './sections/NamespacesSection.svelte';
  import MarketplaceSection from './sections/MarketplaceSection.svelte';
  import PaymentSection from './sections/PaymentSection.svelte';
  import BookmarksSection from './sections/BookmarksSection.svelte';

  let { children }: { children?: Snippet } = $props();

  // ——— Personal (duplicate of /settings) ———
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { clearSession, signer, wallet } from '$lib/shared/state/wallet.svelte';
  import { circles } from '$lib/shared/state/circles';
  import MigrateToV2 from '$lib/flows/migrateToV2/1_GetInvited.svelte';
  import { popupControls } from '$lib/shared/state/popup';
  import { ethers } from 'ethers';
  import { LogOut as LLogOut } from 'lucide';
  import type { Address } from '@circles-sdk/utils';
  import ActionButtonDropDown from '$lib/app/shell/ActionButtonDropDown.svelte';
  import ActionButtonBar from '$lib/app/shell/ActionButtonBar.svelte';
  import type { Action } from '$lib/types/actions';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import { getProfilesBindings } from '$lib/areas/market/offers';
  import { runTask } from '$lib/utils/tasks';
  import { removeProfileFromCache } from '$lib/utils/profile';
  import { CirclesStorage } from '$lib/utils/storage';
  import { gnosisConfig } from '$lib/circlesConfig';

  // ——— Marketplace (duplicate of /market/[seller], but seller = connected avatar) ———
  import {
    loadProfileOrInit,
    normalizeEvmAddress as normalizeAddress,
    rebaseAndSaveProfile,
  } from '@circles-market/sdk';
  import type { AggregatedCatalogItem } from '$lib/areas/market/model';
  import OfferStep1 from '$lib/flows/offer/1_Product.svelte';
  import { getMarketClient } from '$lib/integrations/market';
  import { signInWithSafe } from '$lib/auth/signin';
  import {
    getOrdersByBuyer,
    getOrder,
    subscribeBuyerOrderEvents,
    getSalesBySeller,
  } from '$lib/areas/market/orders/ordersAdapter';
  import type { OrderStatusSseEvent } from '$lib/areas/market/orders/types';
  import OrderDetailsPopup from '$lib/areas/market/orders/OrderDetailsPopup.svelte';

  // ——— Payment (duplicate of /gateway) ———
  import type { GatewayRow } from '$lib/gateway/types';
  import CreateGatewayProfile from '$lib/flows/paymentGateway/CreateGatewayProfile.svelte';
  import { coerceTabId, type TabIdOf } from '$lib/shared/ui/primitives/tabs/tabId';

  const TAB_IDS = ['personal', 'bookmarks', 'orders', 'sales', 'keys', 'namespaces', 'marketplace', 'payment'] as const;
  type TabId = TabIdOf<typeof TAB_IDS>;

  let selectedTab = $state<TabId>('personal');

  $effect(() => {
    const fromUrl = $page.url.searchParams.get('tab');
    selectedTab = coerceTabId(TAB_IDS, fromUrl, 'personal');
  });


  // ——— Orders (buyer) (copied from /orders and embedded here) ———
  type OrdersListItem = {
    key: string; // stable order id used by SSE and fetch (orderNumber)
    displayId: string; // what we show (orderNumber or paymentReference fallback)
    status?: string;
    total?: { price?: number | null; priceCurrency?: string | null } | null;
    customerId?: string | null;
    snapshot?: any; // full order snapshot for popup
  };

  // Auth state must be initialized before using in $derived stores to avoid TDZ
  let ordersAuthed = $state(false);
  let salesAuthed = $state(false);

  function mapOrderItems(items: any[]): OrdersListItem[] {
    return items.map((s, i) => {
      const orderId = (s as any)?.orderNumber ?? `ord_${i}`;
      const displayId = (s as any)?.orderNumber ?? (s as any)?.paymentReference ?? `ord_${i}`;
      return {
        key: orderId,
        displayId,
        status: (s as any)?.orderStatus,
        total: (s as any)?.totalPaymentDue ?? null,
        customerId: (s as any)?.customer?.['@id'] ?? null,
        snapshot: s,
      } as OrdersListItem;
    });
  }

  function buildOrdersAuthedStore(): Readable<{
    data: OrdersListItem[];
    next: () => Promise<boolean>;
    ended: boolean;
  }> {
    type State = {
      data: OrdersListItem[];
      ended: boolean;
      next: () => Promise<boolean>;
      page: number;
      loading: boolean;
    };
    const subscribers = new Set<(v: State) => void>();
    const notify = (v: State) => subscribers.forEach((fn) => fn(v));

    let stopSse: (() => void) | null = null;

    function ensureSse() {
      if (stopSse) return;
      stopSse = subscribeBuyerOrderEvents(async (evt: OrderStatusSseEvent) => {
        if (!evt || typeof evt.orderId !== 'string') return;
        const idx = state.data.findIndex((it) => it.key === evt.orderId);
        if (idx >= 0) {
          const cur = state.data[idx];
          const updated = { ...cur, status: evt.newStatus };
          const nextData = state.data.slice();
          nextData[idx] = updated;
          state = { ...state, data: nextData };
          notify(state);
        }

        if (
          evt.newStatus === 'https://schema.org/PaymentComplete' ||
          evt.newStatus === 'https://schema.org/OrderDelivered'
        ) {
          try {
            const snap = await getOrder(evt.orderId!);
            const idx2 = state.data.findIndex((it) => it.key === evt.orderId);
            if (idx2 >= 0) {
              const total = (snap as any)?.totalPaymentDue ?? state.data[idx2].total ?? null;
              const next = {
                ...state.data[idx2],
                status: (snap as any)?.orderStatus ?? evt.newStatus,
                total,
                snapshot: snap,
              };
              const arr = state.data.slice();
              arr[idx2] = next;
              state = { ...state, data: arr };
              notify(state);

              const outbox = (snap as any)?.outbox;
              if (Array.isArray(outbox) && outbox.length > 0) {
                popupControls.open({
                  title: 'Order updated',
                  component: OrderDetailsPopup,
                  props: { snapshot: snap },
                });
              }
            }
          } catch {
            // ignore fetch errors
          }
        }
      }) as (() => void) | null;
    }

    function stopSseIfIdle() {
      if (subscribers.size === 0 && stopSse) {
        try {
          stopSse();
        } catch {}
        stopSse = null;
      }
    }

    let state: State = {
      data: [],
      ended: false,
      page: 0,
      loading: false,
      next: async () => {
        if (state.loading || state.ended) return true;
        state = { ...state, loading: true };
        notify(state);
        try {
          const nextPage = state.page + 1;
          const resp = await getOrdersByBuyer(nextPage, 50);
          const items = Array.isArray(resp?.items) ? resp.items : [];
          const data = state.data.concat(mapOrderItems(items));
          const ended = items.length === 0;
          state = { ...state, data, page: nextPage, ended, loading: false };
          notify(state);
          return true;
        } catch {
          state = { ...state, ended: true, loading: false };
          notify(state);
          return true;
        }
      },
    };

    return {
      subscribe(run: (v: State) => void) {
        subscribers.add(run);
        if (subscribers.size === 1) ensureSse();
        run(state);
        return () => {
          subscribers.delete(run);
          stopSseIfIdle();
        };
      },
    } as any;
  }

  function buildSalesAuthedStore(): Readable<{
    data: OrdersListItem[];
    next: () => Promise<boolean>;
    ended: boolean;
  }> {
    type State = {
      data: OrdersListItem[];
      ended: boolean;
      next: () => Promise<boolean>;
      page: number;
      loading: boolean;
    };
    const subscribers = new Set<(v: State) => void>();
    const notify = (v: State) => subscribers.forEach((fn) => fn(v));

    let state: State = {
      data: [],
      ended: false,
      page: 0,
      loading: false,
      next: async () => {
        if (state.loading || state.ended) return true;
        state = { ...state, loading: true };
        notify(state);
        try {
          const nextPage = state.page + 1;
          const resp = await getSalesBySeller(nextPage, 50);
          const items = Array.isArray(resp?.items) ? resp.items : [];
          const data = state.data.concat(mapOrderItems(items));
          const ended = items.length === 0;
          state = { ...state, data, page: nextPage, ended, loading: false };
          notify(state);
          return true;
        } catch {
          state = { ...state, ended: true, loading: false };
          notify(state);
          return true;
        }
      },
    };

    return {
      subscribe(run: (v: State) => void) {
        subscribers.add(run);
        run(state);
        return () => {
          subscribers.delete(run);
        };
      },
    } as any;
  }

  function buildOrdersFallbackStore(): Readable<{
    data: OrdersListItem[];
    next: () => Promise<boolean>;
    ended: boolean;
  }> {
    type State = { data: OrdersListItem[]; ended: boolean; next: () => Promise<boolean> };
    let state: State = { data: [], ended: true, next: async () => true };
    return {
      subscribe(run: (v: State) => void) {
        run(state);
        return () => {};
      },
    } as any;
  }

  const ordersStore = $derived<
    Readable<{ data: OrdersListItem[]; next: () => Promise<boolean>; ended: boolean }>
  >(
    browser
      ? ordersAuthed
        ? buildOrdersAuthedStore()
        : buildOrdersFallbackStore()
      : ({
          subscribe(run: any) {
            run({ data: [], next: async () => true, ended: true });
            return () => {};
          },
        } as any),
  );

  const salesStore = $derived<
    Readable<{ data: OrdersListItem[]; next: () => Promise<boolean>; ended: boolean }>
  >(
    browser
      ? salesAuthed
        ? buildSalesAuthedStore()
        : buildOrdersFallbackStore()
      : ({
          subscribe(run: any) {
            run({ data: [], next: async () => true, ended: true });
            return () => {};
          },
        } as any),
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
  const pinApiBase = gnosisConfig.production.marketApiBase;

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

  function getNsBindings() {
    return getProfilesBindings({ pinApiBase }).bindings;
  }

  async function loadNamespacesProfile(): Promise<void> {
    nsLoading = true;
    nsError = null;
    nsResolvedAvatar = null;
    nsNamespaces = {};

    try {
      if (!avatarAddress) return;
      const norm = normalizeAddress(avatarAddress) as Address;
      nsResolvedAvatar = norm;
      const { profile } = await loadProfileOrInit(getNsBindings(), norm);
      const nsObj = profile.namespaces && typeof profile.namespaces === 'object' ? profile.namespaces : {};
      nsNamespaces = { ...(nsObj as Record<string, string>) };
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
    const bindings = getNsBindings();

    await runTask({
      name: 'Saving namespaces…',
      promise: (async () => {
        const cid = await rebaseAndSaveProfile(bindings, nsResolvedAvatar!, (p: any) => {
          p.namespaces = nsNamespaces;
        });
        await bindings.updateAvatarProfileDigest(nsResolvedAvatar!, cid);
        removeProfileFromCache(nsResolvedAvatar!);
      })(),
    });
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
      const confirmDelete = window.confirm(
        'Delete the Circles magic words (private key) from this device? You will need to import them again next time you connect.',
      );
      if (!confirmDelete) return;
      CirclesStorage.getInstance().data = { privateKey: undefined };
      // Drop in-memory reference too
      try {
        (signer as any).privateKey = undefined;
      } catch {}
      alert('Local key deleted from this device. You remain connected until you disconnect.');
    } catch (e) {
      console.error('Failed to delete local key', e);
      alert('Failed to delete key. See console for details.');
    }
  }

  // ——— Marketplace seller data (seller = connected avatar) ———
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
    popupControls.open({
      title: 'Create Offer',
      component: OfferStep1,
      props: {
        context: {
          operator: gnosisConfig.production.marketOperator,
          pinApiBase: gnosisConfig.production.marketApiBase,
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

  // ——— Payment gateways (copied from /gateway) ———
  type GatewayListStore = {
    data: GatewayRow[];
    next: () => Promise<boolean>;
    ended: boolean;
  };

  const myGatewaysStoreInner = writable<GatewayListStore>({
    data: [],
    next: async () => true,
    ended: true,
  });

  const myGatewaysStore: Readable<GatewayListStore> = {
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

      const resp = await $circles.circlesRpc.call<{
        columns: string[];
        rows: any[][];
      }>('circles_query', [
        {
          Namespace: 'CrcV2_PaymentGateway',
          Table: 'GatewayCreated',
          Columns: ['gateway', 'timestamp', 'transactionHash', 'blockNumber'],
          Filter: [
            {
              Type: 'FilterPredicate',
              FilterType: 'Equals',
              Column: 'owner',
              Value: gatewayOwnerAddress.toLowerCase(),
            },
          ],
          Order: [],
        },
      ]);

      const cols = resp?.result?.columns ?? [];
      const rows = resp?.result?.rows ?? [];

      const idxG = cols.indexOf('gateway');
      const idxTs = cols.indexOf('timestamp');
      const idxTx = cols.indexOf('transactionHash');
      const idxBn = cols.indexOf('blockNumber');

      const rowsMapped: GatewayRow[] = rows
        .map((r) => {
          const gateway = r[idxG] ? ethers.getAddress(r[idxG]) : '';
          if (!gateway) return null;
          return {
            gateway,
            timestamp: r[idxTs] ? Number(r[idxTs]) : undefined,
            tx: r[idxTx] ?? undefined,
            blockNumber: r[idxBn] ? Number(r[idxBn]) : 0,
            transactionIndex: 0,
            logIndex: 0,
          } as GatewayRow;
        })
        .filter((r): r is GatewayRow => r !== null)
        .sort((a, b) => b.blockNumber - a.blockNumber);

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
    popupControls.open({
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
        <Tab id="namespaces" title="Namespaces" />
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