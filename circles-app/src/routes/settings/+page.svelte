<script lang="ts">
  import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
  import Tabs from '$lib/components/tabs/Tabs.svelte';
  import Tab from '$lib/components/tabs/Tab.svelte';
  import { writable, type Readable } from 'svelte/store';
  import { browser } from '$app/environment';

  // ——— Personal (duplicate of /settings) ———
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { clearSession, signer, wallet } from '$lib/stores/wallet.svelte';
  import { circles } from '$lib/stores/circles';
  import { canMigrate } from '$lib/guards/canMigrate';
  import MigrateToV2 from '$lib/flows/migrateToV2/1_GetInvited.svelte';
  import { popupControls } from '$lib/stores/popup';
  import GroupSetting from '../settings/editors/GroupSetting.svelte';
  import { ethers } from 'ethers';
  import ProfileExplorer from '$lib/profile/ProfileExplorer.svelte';
  import ProfileNamespaces from '$lib/profile/ProfileNamespaces.svelte';
  import ProfileSigningKeys from '$lib/profile/ProfileSigningKeys.svelte';
  import { LogOut as LLogOut } from 'lucide';
  import type { Address } from '@circles-sdk/utils';
  import ActionButtonDropDown from '$lib/components/layout/ActionButtonDropDown.svelte';
  import ActionButtonBar from '$lib/components/layout/ActionButtonBar.svelte';
  import type { Action } from '$lib/types/actions';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import { ipfsGatewayUrl } from '$lib/utils/ipfs';
  import { getProfilesBindings } from '$lib/offers/profilesBindings';
  import { runTask } from '$lib/utils/tasks';
  import { removeProfileFromCache } from '$lib/utils/profile';
  import {
    getSettings as getMarketSettings,
    parseAddresses,
    saveSettings as saveMarketSettings,
  } from '$lib/stores/marketSettings.svelte';
  import { CirclesStorage } from '$lib/utils/storage';
  import { gnosisConfig } from '$lib/circlesConfig';

  // ——— Marketplace (duplicate of /market/[seller], but seller = connected avatar) ———
  import {
    loadProfileOrInit,
    normalizeEvmAddress as normalizeAddress,
    rebaseAndSaveProfile,
  } from '@circles-market/sdk';
  import type { AggregatedCatalogItem } from '$lib/market/types';
  import ProductCard from '$lib/components/ProductCard.svelte';
  import OfferStep1 from '$lib/flows/offer/1_Product.svelte';
  import { getMarketClient } from '$lib/sdk/marketClient';
  import { signInWithSafe } from '$lib/auth/signin';
  import { getOrdersByBuyer, getOrder, subscribeBuyerOrderEvents } from '$lib/orders/ordersAdapter';
  import type { OrderStatusSseEvent } from '$lib/orders/types';
  import OrderRow from '../orders/OrderRow.svelte';
  import OrderDetailsPopup from '$lib/orders/OrderDetailsPopup.svelte';

  // ——— Payment (duplicate of /gateway) ———
  import GenericList from '$lib/components/GenericList.svelte';
  import GatewayRowView from '$lib/gateway/GatewayRow.svelte';
  import type { GatewayRow } from '$lib/gateway/types';
  import CreateGatewayProfile from '$lib/flows/paymentGateway/CreateGatewayProfile.svelte';

  type TabId = 'personal' | 'orders' | 'keys' | 'namespaces' | 'marketplace' | 'payment';
  let selectedTab: TabId = $state('personal');

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

  // ——— Shared / personal derived state ———
  const avatarAddress = $derived(
          (avatarState.avatar?.address ??
                  avatarState.avatar?.avatarInfo?.avatar ??
                  '') as Address | ''
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
    loadMarketSettingsSection();
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
      const nsObj =
              profile.namespaces && typeof profile.namespaces === 'object' ? profile.namespaces : {};
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

  // ——— Market settings (per avatar) ———
  let extraAvatarsText: string = $state('');
  let extraOperatorsText: string = $state('');
  let marketSaved: string | null = $state(null);

  function loadMarketSettingsSection(): void {
    marketSaved = null;
    const ms = getMarketSettings(avatarAddress);
    extraAvatarsText = (ms.extraAvatars || []).join('\n');
    extraOperatorsText = (ms.extraOperators || []).join('\n');
  }

  function saveMarketSettingsSection(): void {
    const extraAvatars = parseAddresses(extraAvatarsText);
    const extraOperators = parseAddresses(extraOperatorsText);
    saveMarketSettings(avatarAddress, { extraAvatars, extraOperators });
    marketSaved = 'Saved';
    // Slight timeout to fade message
    setTimeout(() => {
      marketSaved = null;
    }, 1500);
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

      const catalog = getMarketClient().catalog.forOperator(
              gnosisConfig.production.marketOperator,
      );
      const items = await catalog.fetchSellerCatalog(normalized);
      // fetchSellerCatalog already filters by seller, but keep this defensive filter
      marketProducts = items.filter(
              (p) => (p.seller ?? '').toLowerCase() === normalized.toLowerCase(),
      );
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

  const headerActions = $derived(
          selectedTab === 'marketplace'
                  ? actionsMarketplace
                  : selectedTab === 'orders'
                          ? actionsOrders
                  : selectedTab === 'payment'
                          ? actionsPayment
                          : actionsPersonal,
  );

  if (browser) {
    ordersAuthed = !!getMarketClient().auth.getAuthMeta();
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
  const shortGatewayAddr = (a?: string) =>
          a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '';

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
        <Tab id="personal" title="Personal" />
        <Tab id="orders" title="Orders" />
        <Tab id="marketplace" title="Marketplace" />
        <Tab id="payment" title="Payment" />
        <Tab id="namespaces" title="Namespaces" />
        <Tab id="keys" title="Keys" />
      </Tabs>
    </div>

    <div class="flex flex-col w-full gap-y-4">
      {#if selectedTab === 'personal'}
        {#if avatarAddress}
          <div class="w-full -mt-1 text-xs text-base-content/70 flex flex-wrap items-center gap-2">
            <span class="font-semibold">Profile CID:</span>
            {#if profileCidLoading}
              <span>loading…</span>
            {:else if profileCid}
              <span class="font-mono select-all break-all">{profileCid}</span>
              <button class="btn btn-ghost btn-xs" onclick={copyProfileCid}>Copy</button>
              <a
                      class="link link-primary text-xs"
                      href={ipfsGatewayUrl(profileCid)}
                      target="_blank"
                      rel="noopener noreferrer"
              >
                Open
              </a>
            {:else}
              <span class="opacity-70">none yet</span>
            {/if}
            {#if profileCidError}
              <span class="text-error">{profileCidError}</span>
            {/if}
          </div>
          <ProfileExplorer
                  avatar={avatarAddress}
                  pinApiBase={pinApiBase}
                  showNamespaces={false}
                  showSigningKeys={false}
          />
        {:else}
          <div class="p-4 text-sm opacity-70">Connect a Circles avatar first to edit your profile.</div>
        {/if}

        {#if avatarAddress}
          <div class="w-full pt-2">
            <h2 class="font-bold">Market settings</h2>
            <div class="mt-1 text-xs text-base-content/70">
              These settings are saved per avatar on this device.
            </div>
            <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="flex flex-col gap-1">
                <label class="text-sm font-medium">Extra avatars to scan</label>
                <textarea
                        class="textarea textarea-bordered font-mono text-xs min-h-[120px]"
                        placeholder="0xabc..., one per line or comma-separated"
                        bind:value={extraAvatarsText}
                ></textarea>
                <div class="text-xs opacity-70">Defaults are always included; add more here.</div>
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-sm font-medium">Extra operators</label>
                <textarea
                        class="textarea textarea-bordered font-mono text-xs min-h-[120px]"
                        placeholder="0xoperator..., one per line or comma-separated"
                        bind:value={extraOperatorsText}
                ></textarea>
                <div class="text-xs opacity-70">Optional. Currently not used everywhere.</div>
              </div>
            </div>
            <div class="mt-3 flex items-center gap-2">
              <button class="btn btn-primary btn-sm" onclick={saveMarketSettingsSection}>Save</button>
              {#if marketSaved}
                <span class="text-xs text-success">{marketSaved}</span>
              {/if}
            </div>
          </div>
        {/if}

        {#if avatarState.isGroup}
          <div class="w-full pt-2">
            <h2 class="font-bold">Advanced Group Settings</h2>
            <GroupSetting />
          </div>
        {/if}

        {#if avatarState.avatar?.avatarInfo && canMigrate(avatarState.avatar.avatarInfo)}
          {#if avatarState.avatar?.avatarInfo?.version === 1}
            <div class="w-full pt-2">
              <h2 class="text-lg font-medium">Circles V2</h2>
              <div class="mt-3">
                <ActionButton action={migrateToV2}>Update to Circles V2</ActionButton>
              </div>
            </div>
          {/if}
          {#if avatarState.avatar?.avatarInfo?.v1Token && !avatarState.avatar?.avatarInfo?.v1Stopped}
            <div class="w-full pt-2">
              <h2 class="text-lg font-medium">Circles V1</h2>
              <div class="mt-3">
                <ActionButton action={stopV1}>
                  <span class="text-orange-400">Stop V1 account permanently</span>
                </ActionButton>
              </div>
            </div>
          {/if}
        {/if}

      {:else if selectedTab === 'orders'}
        <section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
          <div class="text-sm mb-2">
            <strong>My Orders</strong>
            <span class="opacity-60"> · Orders for the authenticated wallet</span>
          </div>

          {#if !avatarAddress}
            <div class="text-sm opacity-70">Connect an avatar to sign in and view orders.</div>
          {:else if !ordersAuthed}
            <div class="text-sm opacity-70">
              Sign in to view orders.
              <button class="btn btn-primary btn-sm ml-2" onclick={() => ensureOrdersAuthed()}>
                Sign in
              </button>
            </div>
          {:else}
            <GenericList store={ordersStore} row={OrderRow} getKey={(it) => it.key} />
          {/if}
        </section>

      {:else if selectedTab === 'keys'}
        {#if !avatarAddress}
          <div class="p-4 text-sm opacity-70">Connect a Circles avatar first to manage keys.</div>
        {:else}
          <ProfileSigningKeys avatar={avatarAddress} {pinApiBase} readonly={false} />

          <div class="w-full pt-4">
            <h2 class="font-bold">Security</h2>
            <div class="mt-2 text-xs text-base-content/70">Manage keys stored on this device.</div>
            <div class="mt-3">
              <button
                      class="btn btn-outline btn-sm"
                      onclick={deleteLocalKey}
                      title="Remove the Circles.garden key from this device"
              >
                Delete key from this device
              </button>
            </div>
          </div>
        {/if}
      {:else if selectedTab === 'namespaces'}
        {#if !avatarAddress}
          <div class="p-4 text-sm opacity-70">
            Connect a Circles avatar first to edit your namespaces.
          </div>
        {:else}
          {#if nsError}
            <div class="alert alert-error text-xs">{nsError}</div>
          {/if}

          <section class="bg-base-100 border border-base-300 rounded-xl p-4 shadow-sm w-full">
            <div class="flex items-center justify-between mb-2">
              <h3 class="font-semibold text-sm m-0">Namespaces</h3>
              <span class="text-[11px] opacity-60">App/profile sources</span>
            </div>

            {#if nsLoading}
              <div class="text-sm opacity-70">Loading…</div>
            {:else if nsResolvedAvatar}
              <ProfileNamespaces
                      avatar={nsResolvedAvatar}
                      {pinApiBase}
                      namespaces={nsNamespaces}
                      readonly={!nsIsOwner}
                      on:namespacesChanged={(e) =>
                  onNamespacesChanged(new CustomEvent('namespacesChanged', { detail: e.detail }))}
              />
            {:else}
              <div class="text-sm opacity-70">No avatar resolved.</div>
            {/if}
          </section>

          {#if nsIsOwner}
            <div class="flex justify-end w-full">
              <button class="btn btn-primary btn-sm" onclick={saveNamespacesProfile}>
                Save
              </button>
            </div>
          {/if}
        {/if}
      {:else if selectedTab === 'marketplace'}
        {#if !avatarAddress}
          <div class="p-4 text-sm opacity-70">Connect a Circles avatar to see your marketplace listings.</div>
        {:else}
          {#if marketLoading}
            <div class="flex flex-col items-center justify-center h-[50vh]">
              <div class="loading loading-spinner loading-lg" aria-label="loading"></div>
              <div class="mt-3 text-base-content/70">Loading listings…</div>
            </div>
          {:else if marketErrorMsg}
            <section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
              <div class="alert alert-error">
                <span class="font-semibold">Failed to load:</span>&nbsp;{marketErrorMsg}
              </div>
            </section>
          {:else}
            <section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
              <div class="flex items-center justify-between mb-3">
                <div class="text-sm">
                  <strong>Listings</strong>
                  <span class="opacity-70">
                    {marketProducts.length ? ` (${marketProducts.length})` : ''}
                  </span>
                </div>
              </div>

              {#if marketProducts.length === 0}
                <div class="text-center py-8 opacity-60">
                  <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-12 w-12 mx-auto mb-2 text-base-content/30"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                  >
                    <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                  <div>No listings found for this seller</div>
                </div>
              {:else}
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {#each marketProducts as p (p.productCid)}
                    <ProductCard
                            product={p}
                            showSellerInfo={false}
                            ondeleted={() => loadSellerCatalog()}
                            canTombstone={true}
                    />
                  {/each}
                </div>
              {/if}
            </section>
          {/if}
        {/if}
      {:else if selectedTab === 'payment'}
        <section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
          <div class="flex items-center justify-between mb-3">
            <div class="text-sm">
              <strong>Payment gateways</strong>
              {#if gatewayOwnerAddress}
                <span class="opacity-60"> · Owner {shortGatewayAddr(gatewayOwnerAddress)}</span>
              {/if}
            </div>
          </div>

          {#if !gatewayOwnerAddress}
            <div class="text-sm opacity-70">Connect an avatar to see your payment gateways.</div>
          {:else if !$circles}
            <div class="text-sm opacity-70">Connect an avatar to load your gateways.</div>
          {:else if loadingGateways}
            <div class="loading loading-spinner loading-md"></div>
          {:else}
            {#if ($myGatewaysStore?.data ?? []).length === 0}
              <div class="text-sm opacity-70">No gateways found for your avatar.</div>
            {:else}
              <GenericList
                      store={myGatewaysStore}
                      row={GatewayRowView}
                      rowHeight={64}
                      maxPlaceholderPages={1}
                      expectedPageSize={25}
              />
            {/if}
          {/if}
        </section>
      {:else}
        <div class="p-4 text-sm opacity-70">Select a tab.</div>
      {/if}
    </div>
  </div>
</PageScaffold>
