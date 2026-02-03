<script lang="ts">
  import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import { browser } from '$app/environment';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { runTask } from '$lib/utils/tasks';
  import {
    getAdminToken,
    setAdminToken,
    clearAdminToken,
    signInAdminWithSafe,
    type AdminVerifyResponse,
  } from '$lib/gateway/adminAuth';
  import {
    listRoutes,
    upsertRoute,
    disableRoute,
    listOdooConnections,
    upsertOdooConnection,
    disableOdooConnection,
    listOdooProducts,
    upsertOdooProduct,
    disableOdooProduct,
    listCodeProducts,
    upsertCodeProduct,
    disableCodeProduct,
    type MarketRoute,
    type RouteUpsertInput,
    type OdooConnectionConfig,
    type OdooConnectionListItem,
    type OdooProductConfig,
    type CodeProductConfig,
    type OdooProductListItem,
    type CodeProductListItem,
  } from '$lib/gateway/adminClient';
  import { gnosisConfig } from '$lib/circlesConfig';
  import type { Address } from '@circles-sdk/utils';
  import { popupControls } from '$lib/stores/popup';
  import AdminSectionCard from '$lib/admin/components/AdminSectionCard.svelte';
  import AdminProductList from '$lib/admin/components/AdminProductList.svelte';
  import AdminOdooProductEditor from '$lib/admin/components/AdminOdooProductEditor.svelte';
  import AdminCodeProductEditor from '$lib/admin/components/AdminCodeProductEditor.svelte';
  import AdminNewProductSellerStep from '$lib/admin/flows/newProduct/1_Seller.svelte';
  import AdminNewConnectionSellerStep from '$lib/admin/flows/newConnection/1_Seller.svelte';
  import { combineAdminProducts, adminOdooConnectionKey } from '$lib/admin/helpers';
  import { resolveAdminProductType } from '$lib/admin/types';
  import type { AdminProductType, AdminUnifiedProduct, AdminOdooConnection } from '$lib/admin/types';
  import { shortenAddress } from '$lib/utils/shared';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import RowFrame from '$lib/ui/RowFrame.svelte';
  import AdminStatusBadge from '$lib/admin/components/AdminStatusBadge.svelte';
  import Tabs from '$lib/components/tabs/Tabs.svelte';
  import Tab from '$lib/components/tabs/Tab.svelte';
  import type { TabIdOf } from '$lib/components/tabs/tabId';

  // Auth state
  let adminUser: AdminVerifyResponse | null = $state(null);
  let authLoading: boolean = $state(false);
  let authError: string | null = $state(null);

  // Routes state
  let routes: MarketRoute[] = $state([]);
  let routesLoading: boolean = $state(false);
  let routesError: string | null = $state(null);

  // Odoo connection state
  let odooConnections: OdooConnectionListItem[] = $state([]);
  let connectionsLoading: boolean = $state(false);
  let connectionsError: string | null = $state(null);

  // Adapter mappings state
  let odooProducts: OdooProductListItem[] = $state([]);
  let codeProducts: CodeProductListItem[] = $state([]);
  let productsLoading: boolean = $state(false);
  let productsError: string | null = $state(null);

  let defaultProductType: AdminProductType = $state('odoo');

  const unifiedProducts = $derived(combineAdminProducts(routes, odooProducts, codeProducts));
  const hasRouteOnlyProducts = $derived(unifiedProducts.some((item) => !item.odoo && !item.code));
  const loadingAny = $derived(productsLoading || routesLoading || connectionsLoading);

  const codeProductsUnified = $derived(unifiedProducts.filter((item) => resolveAdminProductType(item) === 'codedispenser'));
  const odooProductsUnified = $derived(unifiedProducts.filter((item) => resolveAdminProductType(item) === 'odoo'));
  const routeOnlyProductsUnified = $derived(unifiedProducts.filter((item) => resolveAdminProductType(item) === 'route'));

  const PRODUCT_TAB_IDS = ['codedispenser', 'odoo', 'route'] as const;
  type ProductsTabId = TabIdOf<typeof PRODUCT_TAB_IDS>;
  let selectedProductsTab = $state<ProductsTabId>('codedispenser');

  async function connectAdminWallet(): Promise<void> {
    authLoading = true;
    authError = null;

    try {
      const avatar = (avatarState.avatar?.address ?? avatarState.avatar?.avatarInfo?.avatar ?? '') as Address | '';
      if (!avatar) {
        throw new Error('No avatar connected');
      }

      const verifyResult = await runTask({
        name: 'Signing in as admin…',
        promise: signInAdminWithSafe({
          avatar: avatar.toLowerCase() as Address,
          chainId: gnosisConfig.production.marketChainId,
        }),
      });

      setAdminToken(verifyResult.token);
      adminUser = verifyResult;
      void loadAdminData();
    } catch (e) {
      authError = e instanceof Error ? e.message : String(e);
      clearAdminToken();
      adminUser = null;
    } finally {
      authLoading = false;
    }
  }

  function disconnectAdmin(): void {
    clearAdminToken();
    adminUser = null;
    routes = [];
    odooConnections = [];
    odooProducts = [];
    codeProducts = [];
  }

  async function loadRoutes(): Promise<void> {
    routesLoading = true;
    routesError = null;

    try {
      routes = await runTask({
        name: 'Loading routes…',
        promise: listRoutes(),
      });
    } catch (e) {
      routesError = e instanceof Error ? e.message : String(e);
    } finally {
      routesLoading = false;
    }
  }

  async function loadConnections(): Promise<void> {
    connectionsLoading = true;
    connectionsError = null;

    try {
      odooConnections = await runTask({
        name: 'Loading Odoo connections…',
        promise: listOdooConnections(),
      });
    } catch (e) {
      connectionsError = e instanceof Error ? e.message : String(e);
    } finally {
      connectionsLoading = false;
    }
  }

  async function loadProducts(): Promise<void> {
    productsLoading = true;
    productsError = null;

    try {
      const [odoo, code] = await runTask({
        name: 'Loading products…',
        promise: Promise.all([
          listOdooProducts(),
          listCodeProducts(),
        ]),
      });
      odooProducts = odoo;
      codeProducts = code;
    } catch (e) {
      productsError = e instanceof Error ? e.message : String(e);
    } finally {
      productsLoading = false;
    }
  }

  async function loadAdminData(): Promise<void> {
    await Promise.all([loadRoutes(), loadConnections(), loadProducts()]);
  }

  function openProductEditor(
    product: AdminUnifiedProduct | null,
    type?: AdminProductType,
    connection?: AdminOdooConnection
  ): void {
    if (type) {
      defaultProductType = type;
    }

    const resolvedType = product
      ? (resolveAdminProductType(product) === 'route' ? defaultProductType : resolveAdminProductType(product))
      : defaultProductType;

    const component = resolvedType === 'codedispenser'
      ? AdminCodeProductEditor
      : AdminOdooProductEditor;

    popupControls.open?.({
      title: product ? 'Edit product' : `New ${resolvedType === 'codedispenser' ? 'Code' : 'Odoo'} product`,
      hideTitle: true,
      component,
      props: {
        product,
        connection,
        connections: odooConnections,
        mode: 'product',
        onCancel: () => popupControls.close(),
        onDisable: product ? async () => handleDisableProduct(product) : undefined,
        onSubmit: async (payload) => {
          await saveProduct(payload, product ?? null);
        },
      },
      id: product?.key ?? `new-${resolvedType}`,
    });
  }

  function openNewProductWizard(): void {
    popupControls.open?.({
      title: 'Setup product - Select Seller',
      component: AdminNewProductSellerStep,
      props: {
        connections: odooConnections,
        existingProducts: unifiedProducts,
        onExecute: async (payload) => {
          await saveProduct(payload, null);
        },
        onCreateConnection: createConnectionInFlow,
      },
      id: 'admin-new-product-seller',
    });
  }

  function openConnectionEditor(connection?: AdminOdooConnection | null): void {
    if (!connection) {
      popupControls.open?.({
        title: 'New Odoo connection',
        component: AdminNewConnectionSellerStep,
        props: {
          onCreate: async (payload) => {
            await saveConnection(payload);
          },
        },
        id: 'admin-new-connection-seller',
      });
      return;
    }

    popupControls.open?.({
      title: 'Edit Odoo connection',
      hideTitle: true,
      component: AdminOdooProductEditor,
      props: {
        connection,
        connections: odooConnections,
        mode: 'connection',
        onCancel: () => popupControls.close(),
        onDisable: async () => handleDisableConnection(connection),
        onSubmit: async (payload) => {
          await saveConnection(payload);
        },
      },
      id: `connection-${connection.chainId}-${connection.seller}`,
    });
  }

  async function createConnectionInFlow(payload: { connection: OdooConnectionConfig }): Promise<AdminOdooConnection> {
    await runTask({
      name: 'Saving Odoo connection…',
      promise: upsertOdooConnection(payload.connection),
    });

    // Refresh connections in-place (do NOT close popup; the flow will continue)
    const updated = await listOdooConnections();
    odooConnections = updated;

    return (
      updated.find(
        (c) =>
          c.chainId === payload.connection.chainId &&
          String(c.seller).toLowerCase() === String(payload.connection.seller).toLowerCase()
      ) ?? (payload.connection as unknown as AdminOdooConnection)
    );
  }

  async function saveConnection(payload: { connection: OdooConnectionConfig }): Promise<void> {
    await runTask({
      name: 'Saving Odoo connection…',
      promise: upsertOdooConnection(payload.connection),
    });
    await loadAdminData();
    popupControls.close();
  }

  async function saveProduct(
    payload: {
      type: AdminProductType;
      route?: RouteUpsertInput;
      odoo?: OdooProductConfig;
      code?: CodeProductConfig;
    },
    product: AdminUnifiedProduct | null
  ): Promise<void> {
    const baseRoute: RouteUpsertInput | null = payload.type !== 'route'
      ? {
        chainId: payload.type === 'odoo' ? payload.odoo!.chainId : payload.code!.chainId,
        seller: payload.type === 'odoo' ? payload.odoo!.seller : payload.code!.seller,
        sku: payload.type === 'odoo' ? payload.odoo!.sku : payload.code!.sku,
        offerType: payload.type,
        isOneOff: false,
        enabled: true,
      }
      : payload.route ?? null;

    if (baseRoute) {
      await runTask({
        name: product ? 'Saving route…' : 'Creating route…',
        promise: upsertRoute(baseRoute),
      });
    }

    if (payload.type === 'odoo' && payload.odoo) {
      await runTask({
        name: product ? 'Saving Odoo product…' : 'Creating Odoo product…',
        promise: upsertOdooProduct(payload.odoo),
      });
    } else if (payload.type === 'codedispenser' && payload.code) {
      await runTask({
        name: product ? 'Saving CodeDispenser product…' : 'Creating CodeDispenser product…',
        promise: upsertCodeProduct(payload.code),
      });
    }

    await loadAdminData();
    popupControls.close();
  }

  async function handleDisableConnection(connection: AdminOdooConnection): Promise<void> {
    const confirmMessage = `Disable Odoo connection for ${shortenAddress(connection.seller)} on chain ${connection.chainId}?`;
    if (!confirm(confirmMessage)) return;

    await runTask({
      name: 'Disabling Odoo connection…',
      promise: disableOdooConnection(connection.chainId, connection.seller),
    });
    await loadAdminData();
    popupControls.close();
  }

  async function handleDisableProduct(product: AdminUnifiedProduct): Promise<void> {
    const confirmMessage = `Disable ${product.sku}? This disables adapter mappings and the route.`;
    if (!confirm(confirmMessage)) return;

    if (product.odoo) {
      await runTask({
        name: 'Disabling Odoo product…',
        promise: disableOdooProduct(product.chainId, product.seller, product.sku),
      });
    } else if (product.code) {
      await runTask({
        name: 'Disabling CodeDispenser product…',
        promise: disableCodeProduct(product.chainId, product.seller, product.sku),
      });
    } else if (product.route) {
      await runTask({
        name: 'Disabling route…',
        promise: disableRoute(product.chainId, product.seller, product.sku),
      });
    }

    await loadAdminData();
    popupControls.close();
  }

  // Check for existing token on mount
  $effect(() => {
    if (!browser || adminUser) return;
    const token = getAdminToken();
    if (token) {
      adminUser = { token, address: '', chainId: 0, expiresIn: 900 };
      void loadAdminData();
    }
  });
</script>

<PageScaffold
  highlight="soft"
  maxWidthClass="page page--lg"
  contentWidthClass="page page--lg"
  usePagePadding={true}
>
  {#snippet title()}
    <h1 class="h2">Market Admin</h1>
  {/snippet}

  {#snippet meta()}
    <span class="text-sm opacity-70">Unified product configuration for the Market API</span>
  {/snippet}

  {#snippet headerActions()}
    {#if !adminUser}
      <ActionButton
        action={connectAdminWallet}
        loading={authLoading}
        variant="primary"
      >
        {authLoading ? 'Connecting…' : 'Login'}
      </ActionButton>
    {:else}
      <ActionButton action={disconnectAdmin} variant="ghost" size="sm">
        Disconnect
      </ActionButton>
    {/if}
  {/snippet}

  <div class="flex flex-col gap-y-6">
    {#if !adminUser}
      <AdminSectionCard
        title="Admin Authentication Required"
        description="Connect an allowlisted admin wallet to manage market configuration."
      >
        {#if authError}
          <p class="text-error text-sm">{authError}</p>
        {/if}
      </AdminSectionCard>
    {:else}

      <AdminSectionCard
        title="Odoo connections"
        description="Manage connection credentials per seller/chain. Odoo products are configured in the Products section."
      >
        {#snippet actions()}
          <button class="btn btn-outline btn-sm" onclick={loadAdminData} disabled={loadingAny}>
            {loadingAny ? 'Refreshing…' : 'Refresh'}
          </button>
          <button class="btn btn-primary btn-sm" onclick={() => openConnectionEditor(null)}>
            New connection
          </button>
        {/snippet}
        {#if connectionsError || productsError || routesError}
          <p class="text-error text-sm">{connectionsError || productsError || routesError}</p>
        {:else if odooConnections.length === 0}
          <p class="text-sm opacity-70">No Odoo connections yet. Create one to enable Odoo products.</p>
        {:else}
          {#each odooConnections as connection (adminOdooConnectionKey(connection.chainId, connection.seller))}
            <RowFrame
              className="bg-base-100"
              dense={true}
              noLeading={true}
              clickable={true}
              onclick={() => openConnectionEditor(connection)}
            >
              {#snippet title()}
                <Avatar address={connection.seller} view="small" clickable={true} />
              {/snippet}
              {#snippet subtitle()}
                {connection.odooUrl}
              {/snippet}
              {#snippet meta()}
                Chain {connection.chainId} · {connection.odooDb}
              {/snippet}
              {#snippet trailing()}
                <div class="flex items-center gap-2 flex-wrap justify-end">
                  <AdminStatusBadge
                    label={connection.enabled ? 'Enabled' : 'Disabled'}
                    variant={connection.enabled ? 'success' : 'warning'}
                  />
                  {#if connection.revokedAt}
                    <AdminStatusBadge label="Revoked" variant="warning" />
                  {/if}
                </div>
              {/snippet}
            </RowFrame>
          {/each}
        {/if}
      </AdminSectionCard>

      <AdminSectionCard
        title="Products"
        description="Products are configured per SKU (route + adapter mapping)."
      >
        {#snippet actions()}
          <button class="btn btn-outline btn-sm" onclick={loadAdminData} disabled={loadingAny}>
            {loadingAny ? 'Refreshing…' : 'Refresh'}
          </button>
          <button class="btn btn-primary btn-sm" onclick={openNewProductWizard}>
            Setup product
          </button>
        {/snippet}
        {#if hasRouteOnlyProducts}
          <p class="text-xs text-warning mt-1">
            Some SKUs only have a route configured. Open them to add the missing product adapter.
          </p>
        {/if}
        {#if productsError || routesError}
          <p class="text-error text-sm">{productsError || routesError}</p>
        {:else}
          <Tabs bind:selected={selectedProductsTab} variant="boxed" size="sm" class="w-full p-0">
            <Tab id="codedispenser" title="Voucher codes" badge={codeProductsUnified.length} panelClass="pt-4">
              {#if codeProductsUnified.length === 0}
                <p class="text-sm opacity-70">No voucher code products configured yet.</p>
              {:else}
                <AdminProductList
                  products={codeProductsUnified}
                  onSelect={(product) => openProductEditor(product, 'codedispenser')}
                  productTypes={['codedispenser']}
                />
              {/if}
            </Tab>

            <Tab id="odoo" title="Odoo" badge={odooProductsUnified.length} panelClass="pt-4">
              {#if odooProductsUnified.length === 0}
                <p class="text-sm opacity-70">No Odoo products configured yet.</p>
              {:else}
                <AdminProductList
                  products={odooProductsUnified}
                  onSelect={(product) => openProductEditor(product, 'odoo')}
                  productTypes={['odoo']}
                />
              {/if}
            </Tab>

            <Tab id="route" title="Route-only" badge={routeOnlyProductsUnified.length} panelClass="pt-4">
              {#if routeOnlyProductsUnified.length === 0}
                <p class="text-sm opacity-70">No route-only SKUs.</p>
              {:else}
                <AdminProductList
                  products={routeOnlyProductsUnified}
                  onSelect={(product) => openProductEditor(product, 'route')}
                  productTypes={['route']}
                />
              {/if}
            </Tab>
          </Tabs>
        {/if}
      </AdminSectionCard>

      <div class="text-xs opacity-50">
        Token expires in {adminUser?.expiresIn ?? 0}s
        {#if loadingAny}
          <span class="ml-2">Refreshing…</span>
        {/if}
      </div>
    {/if}
  </div>
</PageScaffold>