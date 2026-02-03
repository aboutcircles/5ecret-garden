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
    adminHealth,
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
  import { combineAdminProducts, adminOdooConnectionKey } from '$lib/admin/helpers';
  import { resolveAdminProductType } from '$lib/admin/types';
  import type { AdminProductType, AdminUnifiedProduct, AdminOdooConnection } from '$lib/admin/types';
  import { shortenAddress } from '$lib/utils/shared';
  import RowFrame from '$lib/ui/RowFrame.svelte';
  import AdminStatusBadge from '$lib/admin/components/AdminStatusBadge.svelte';

  // Auth state
  let adminUser: AdminVerifyResponse | null = $state(null);
  let authLoading: boolean = $state(false);
  let authError: string | null = $state(null);
  let healthError: string | null = $state(null);

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
  const productsByConnection = $derived.by(() => {
    const map = new Map<string, AdminUnifiedProduct[]>();
    for (const product of unifiedProducts) {
      if (!product.odoo && product.route?.offerType !== 'odoo') continue;
      const key = adminOdooConnectionKey(product.chainId, product.seller);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(product);
    }
    for (const items of map.values()) {
      items.sort((a, b) => a.sku.localeCompare(b.sku));
    }
    return map;
  });

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

  async function checkHealth(): Promise<void> {
    healthError = null;
    try {
      await runTask({
        name: 'Checking admin API…',
        promise: adminHealth(),
      });
    } catch (e) {
      healthError = e instanceof Error ? e.message : String(e);
    }
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
      ? resolveAdminProductType(product)
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

  function openConnectionEditor(connection?: AdminOdooConnection | null): void {
    popupControls.open?.({
      title: connection ? 'Edit Odoo connection' : 'New Odoo connection',
      hideTitle: true,
      component: AdminOdooProductEditor,
      props: {
        connection: connection ?? null,
        connections: odooConnections,
        mode: 'connection',
        onCancel: () => popupControls.close(),
        onDisable: connection ? async () => handleDisableConnection(connection) : undefined,
        onSubmit: async (payload) => {
          await saveConnection(payload);
        },
      },
      id: connection ? `connection-${connection.chainId}-${connection.seller}` : 'new-odoo-connection',
    });
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

  <div class="flex flex-col gap-y-6">
    {#if !adminUser}
      <AdminSectionCard
        title="Admin Authentication Required"
        description="Connect an allowlisted admin wallet to manage market configuration."
      >
        <ActionButton
          action={connectAdminWallet}
          loading={authLoading}
          variant="primary"
        >
          {authLoading ? 'Connecting…' : 'Connect Admin Wallet'}
        </ActionButton>
        {#if authError}
          <p class="text-error text-sm">{authError}</p>
        {/if}
      </AdminSectionCard>
    {:else}
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-sm">
          <span class="opacity-70">Connected as:</span>
          <code class="ml-2 font-mono">{shortenAddress(adminUser.address)}</code>
          <span class="ml-2 badge badge-success badge-sm">Admin</span>
        </div>
        <div class="flex items-center gap-2">
          <ActionButton action={checkHealth} variant="ghost" size="sm">
            Check API
          </ActionButton>
          <ActionButton action={disconnectAdmin} variant="ghost" size="sm">
            Disconnect
          </ActionButton>
        </div>
      </div>

      {#if healthError}
        <p class="text-error text-sm">Admin API health check failed: {healthError}</p>
      {/if}

      <AdminSectionCard
        title="Odoo connections"
        description="Create a connection per seller/chain first. Then add Odoo products under it."
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
                {connection.odooDb}
              {/snippet}
              {#snippet subtitle()}
                {connection.odooUrl}
              {/snippet}
              {#snippet meta()}
                Chain {connection.chainId} · {shortenAddress(connection.seller)}
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
                  <button
                    class="btn btn-outline btn-xs"
                    onclick={(event) => {
                      event.stopPropagation();
                      openProductEditor(null, 'odoo', connection);
                    }}
                  >
                    New product
                  </button>
                </div>
              {/snippet}
            </RowFrame>
            {#if (productsByConnection.get(adminOdooConnectionKey(connection.chainId, connection.seller)) ?? []).length > 0}
              <div class="ml-4 border-l border-base-300 pl-4">
                <AdminProductList
                  products={productsByConnection.get(adminOdooConnectionKey(connection.chainId, connection.seller)) ?? []}
                  productTypes={['odoo']}
                  onSelect={(product) => openProductEditor(product, 'odoo', connection)}
                />
              </div>
            {:else}
              <p class="text-xs opacity-60 ml-4">No Odoo products yet for this connection.</p>
            {/if}
          {/each}
        {/if}
      </AdminSectionCard>

      <AdminSectionCard
        title="Products"
        description="Code dispenser products and route-only SKUs. Odoo products live under their connections."
      >
        {#snippet actions()}
          <button class="btn btn-outline btn-sm" onclick={loadAdminData} disabled={loadingAny}>
            {loadingAny ? 'Refreshing…' : 'Refresh'}
          </button>
          <button class="btn btn-primary btn-sm" onclick={() => openProductEditor(null, 'codedispenser')}>
            New Code
          </button>
        {/snippet}
        {#if hasRouteOnlyProducts}
          <p class="text-xs text-warning mt-1">
            Some SKUs only have a route configured. Open them to add the missing product adapter.
          </p>
        {/if}
        {#if productsError || routesError}
          <p class="text-error text-sm">{productsError || routesError}</p>
        {:else if unifiedProducts.filter((item) => resolveAdminProductType(item) !== 'odoo').length === 0}
          <p class="text-sm opacity-70">No code products configured yet.</p>
        {:else}
          <AdminProductList
            products={unifiedProducts.filter((item) => resolveAdminProductType(item) !== 'odoo')}
            onSelect={(product) => openProductEditor(product)}
            productTypes={['codedispenser', 'route']}
          />
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