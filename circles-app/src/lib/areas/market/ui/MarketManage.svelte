<script lang="ts">
  import { readable, writable } from 'svelte/store';
  import { browser } from '$app/environment';

  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { circles } from '$lib/shared/state/circles';
  import { openFlowPopup, popupControls } from '$lib/shared/state/popup';
  import { gnosisConfig } from '$lib/shared/config/circles';
  import { getActiveConfig } from '$lib/shared/state/settings.svelte';
  import type { Address } from '@aboutcircles/sdk-types';

  import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
  import type { AggregatedCatalogItem } from '$lib/areas/market/model';
  import type { OfferFlowContext } from '$lib/areas/market/flows/offer/types';
  import OfferStep1 from '$lib/areas/market/flows/offer/1_Product.svelte';
  import { getMarketClient } from '$lib/shared/data/market/marketClientProxy';
  import { signInWithSafe, isMarketAuthed } from '$lib/areas/market/auth/signin';
  import { getSalesBySeller } from '$lib/areas/market/orders/ordersQueries';
  import {
    mapMarketSales,
    type MarketSalesListItem,
    type MarketOrderSummaryListItem,
  } from '$lib/areas/market/orders/ordersMappers';
  import {
    createPagedListStore,
    createBuyerOrdersStore,
  } from '$lib/areas/market/orders/ordersStores';
  import OrderDetailsPopup from '$lib/areas/market/orders/OrderDetailsPopup.svelte';

  import type { GatewayRow } from '$lib/areas/settings/model/gatewayTypes';
  import type { PaginatedReadable } from '$lib/shared/state/paginatedList';
  import { fetchGatewayRowsByOwner } from '$lib/shared/data/circles/paymentGateways';

  import OrdersSection from '$lib/areas/settings/ui/sections/OrdersSection.svelte';
  import SalesSection from '$lib/areas/settings/ui/sections/SalesSection.svelte';
  import MarketplaceSection from '$lib/areas/settings/ui/sections/MarketplaceSection.svelte';
  import PaymentSection from '$lib/areas/settings/ui/sections/PaymentSection.svelte';

  let { tab }: { tab: 'orders' | 'sales' | 'offers' | 'gateways' } = $props();

  // ——— Shared / connected avatar ———
  const avatarAddress = $derived(
    (avatarState.avatar?.address ?? '') as Address | '',
  );

  // ——— Orders / Sales ———
  // Canonical orders list item model from market/orders domain.
  type OrdersListItem = MarketOrderSummaryListItem;

  // Single auth flag for all marketplace tabs (Orders, Sales, Offers).
  // Backed by PersistentAuthContext in localStorage — one sign-in covers all.
  let marketAuthed = $state(browser ? isMarketAuthed() : false);

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
      ? marketAuthed
        ? buildOrdersAuthedStore()
        : buildOrdersFallbackStore()
      : buildOrdersFallbackStore(),
  );

  const salesStore = $derived(
    browser
      ? marketAuthed
        ? buildSalesAuthedStore()
        : buildSalesFallbackStore()
      : buildSalesFallbackStore(),
  );

  async function ensureMarketAuthed(): Promise<void> {
    try {
      const avatar = (avatarAddress ?? '').toLowerCase();
      if (!avatar || !/^0x[a-f0-9]{40}$/.test(avatar)) {
        throw new Error('No Circles avatar address available for Safe login');
      }
      await signInWithSafe(avatar);
      marketAuthed = isMarketAuthed();
    } catch (e) {
      console.error('[market/manage] safe sign-in failed:', e);
      marketAuthed = false;
    }
  }

  // ——— Offers (connected avatar as seller) ———
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
      const normalized = normalizeAddress(avatarAddress!);

      const catalog = getMarketClient().catalog.forOperator(gnosisConfig.production.marketOperator!);
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
      // Avatars without an operator namespace have no offers — treat as empty, not error
      if (/namespace|not found|404/i.test(msg)) {
        marketProducts = [];
      } else {
        marketErrorMsg = msg;
      }
    } finally {
      marketLoading = false;
    }
  }

  /** Delay before background refetch (gives the indexer time to process the on-chain event). */
  const REFETCH_DELAY_MS = 15_000;

  function openCreateListing() {
    const flowContext: OfferFlowContext = {
      operator: gnosisConfig.production.marketOperator!,
      pinApiBase: getActiveConfig().marketApiBase,
      onPublished: (item) => {
        // Optimistic: prepend new listing immediately
        marketProducts = [item, ...marketProducts];
      },
    };
    openFlowPopup({
      title: 'Create Offer',
      component: OfferStep1,
      props: { context: flowContext },
      onClose: () => {
        // Delayed refetch for eventual consistency with the indexer
        setTimeout(() => { void loadSellerCatalog(); }, REFETCH_DELAY_MS);
      },
    });
  }

  function handleProductUpdated(item: AggregatedCatalogItem) {
    // Optimistic: replace the matching product in-place by SKU
    marketProducts = marketProducts.map((p) =>
      p.product?.sku === item.product?.sku && (p.seller ?? '').toLowerCase() === (item.seller ?? '').toLowerCase()
        ? item
        : p,
    );
    // Delayed refetch for eventual consistency
    setTimeout(() => { void loadSellerCatalog(); }, REFETCH_DELAY_MS);
  }

  function handleProductRemoved(sku: string) {
    // Optimistic: remove the product from the list immediately
    marketProducts = marketProducts.filter((p) => p.product?.sku !== sku);
    // Delayed refetch for eventual consistency
    setTimeout(() => { void loadSellerCatalog(); }, REFETCH_DELAY_MS);
  }

  // ——— Payment gateways ———
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
    if (!gatewayOwnerAddress || !$circles?.rpc) {
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

  // ——— Tab-driven loads ———
  $effect(() => {
    if (tab === 'offers') void loadSellerCatalog();
  });

  $effect(() => {
    if (tab !== 'gateways') return;
    if (gatewayOwnerAddress && $circles?.rpc) {
      void loadMyGateways();
    } else {
      myGatewaysStoreInner.set({ data: [], next: async () => true, ended: true });
    }
  });
</script>

<div
  style="display:flex;flex-direction:column;gap:14px;padding:0 18px 24px;"
  class="md:!px-9 md:!pb-9 md:max-w-[1280px] md:mx-auto"
>
  {#if tab === 'orders'}
    <OrdersSection
      {avatarAddress}
      ordersAuthed={marketAuthed}
      ensureOrdersAuthed={ensureMarketAuthed}
      {ordersStore}
    />
  {:else if tab === 'sales'}
    <SalesSection
      {avatarAddress}
      salesAuthed={marketAuthed}
      ensureSalesAuthed={ensureMarketAuthed}
      {salesStore}
    />
  {:else if tab === 'offers'}
    <MarketplaceSection
      {avatarAddress}
      {marketLoading}
      {marketErrorMsg}
      marketProducts={marketProducts}
      {openCreateListing}
      {loadSellerCatalog}
      onProductUpdated={handleProductUpdated}
      onProductRemoved={handleProductRemoved}
    />
  {:else if tab === 'gateways'}
    <PaymentSection
      {gatewayOwnerAddress}
      circlesReady={!!$circles}
      {loadingGateways}
      {myGatewaysStore}
      {shortGatewayAddr}
      onReloadGateways={loadMyGateways}
    />
  {/if}

  <div style="height:24px;"></div>
</div>
