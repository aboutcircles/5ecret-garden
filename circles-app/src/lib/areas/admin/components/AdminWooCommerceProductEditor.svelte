<script lang="ts">
  import AdminProductFormBase from './AdminProductFormBase.svelte';
  import type { AdminProductType, AdminUnifiedProduct, AdminWcConnection } from '../types';
  import {
    listWcProductCatalog,
    type WcConnectionConfig,
    type WcProductConfig,
    type WcProductCatalogItem,
  } from '$lib/areas/admin/services/gateway/adminClient';
  import { normalizeAddressInput, normalizeSku } from '../productEditorUtils';

  interface Props {
    product?: AdminUnifiedProduct | null;
    connection?: AdminWcConnection | null;
    connections?: AdminWcConnection[];
    mode?: 'connection' | 'product';
    onSubmit: (payload: {
      type?: AdminProductType;
      wc?: WcProductConfig;
      connection?: WcConnectionConfig;
    }) => Promise<void>;
    onDisable?: () => Promise<void>;
    onCancel?: () => void;
  }

  let {
    product = null,
    connection = null,
    connections = [],
    mode = 'product',
    onSubmit,
    onDisable,
    onCancel,
  }: Props = $props();

  const chainId = 100;

  // svelte-ignore state_referenced_locally
  let seller: string = $state(product?.seller ?? connection?.seller ?? '');
  // svelte-ignore state_referenced_locally
  let sku: string = $state(product?.sku ?? '');
  // svelte-ignore state_referenced_locally
  let wcProductSku: string = $state(product?.wc?.wcProductSku ?? '');
  // svelte-ignore state_referenced_locally
  let productEnabled: boolean = $state(product?.wc?.enabled ?? true);

  // Connection fields
  // svelte-ignore state_referenced_locally
  let wcBaseUrl: string = $state(connection?.wcBaseUrl ?? '');
  let wcConsumerKey: string = $state('');
  let wcConsumerSecret: string = $state('');
  // svelte-ignore state_referenced_locally
  let orderStatus: string = $state(connection?.orderStatus ?? 'pending');
  // svelte-ignore state_referenced_locally
  let timeoutMs: number = $state(connection?.timeoutMs ?? 30000);
  // svelte-ignore state_referenced_locally
  let fulfillInheritRequestAbort: boolean = $state(connection?.fulfillInheritRequestAbort ?? true);
  // svelte-ignore state_referenced_locally
  let connectionEnabled: boolean = $state(connection?.enabled ?? true);

  // svelte-ignore state_referenced_locally
  let selectedConnectionKey: string = $state(
    connection
      ? `${chainId}:${connection.seller.toLowerCase()}`
      : product
        ? `${chainId}:${product.seller.toLowerCase()}`
        : ''
  );

  let saving = $state(false);
  let formError: string | null = $state(null);

  // Catalog picker state
  let catalogSearch = $state('');
  let catalogOpen = $state(false);
  let catalogLoading = $state(false);
  let catalogError = $state<string | null>(null);
  let catalogItems = $state<WcProductCatalogItem[]>([]);
  let catalogOffset = $state(0);
  const catalogPerPage = 100;
  let catalogHasMore = $state(false);

  const connectionOptions = $derived.by(() =>
    connections.map((item) => ({
      key: `${chainId}:${item.seller.toLowerCase()}`,
      label: `${item.wcBaseUrl}`,
      connection: item,
    }))
  );

  const selectedConnection = $derived(
    connectionOptions.find((o) => o.key === selectedConnectionKey)?.connection ?? null
  );

  const isConnectionMode = $derived(mode === 'connection');
  const isProductMode = $derived(mode === 'product');
  const needsConnectionSelection = $derived(isProductMode && !selectedConnection);
  const hasConnectionChoice = $derived(connectionOptions.length > 0);

  $effect(() => {
    if (!isProductMode || !selectedConnection) return;
    seller = selectedConnection.seller;
    wcBaseUrl = selectedConnection.wcBaseUrl;
    orderStatus = selectedConnection.orderStatus;
    timeoutMs = selectedConnection.timeoutMs;
    fulfillInheritRequestAbort = selectedConnection.fulfillInheritRequestAbort;
    connectionEnabled = selectedConnection.enabled;

    catalogSearch = '';
    catalogOpen = false;
    catalogItems = [];
    catalogOffset = 0;
    catalogHasMore = false;
    catalogError = null;
    void loadCatalogPage(true);
  });

  async function loadCatalogPage(reset: boolean): Promise<void> {
    if (!selectedConnection) return;
    catalogLoading = true;
    catalogError = null;
    try {
      const offset = reset ? 0 : catalogOffset;
      const r = await listWcProductCatalog({
        chainId,
        seller: selectedConnection.seller,
        perPage: catalogPerPage,
        offset,
      });
      const items = r.items ?? [];
      if (reset) {
        catalogItems = items;
        catalogOffset = items.length;
      } else {
        catalogItems = [...catalogItems, ...items];
        catalogOffset = catalogOffset + items.length;
      }
      catalogHasMore = items.length === catalogPerPage;
    } catch (e) {
      catalogError = e instanceof Error ? e.message : 'Failed to load WooCommerce product catalog.';
    } finally {
      catalogLoading = false;
    }
  }

  const filteredCatalogItems = $derived.by(() => {
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return catalogItems;
    return catalogItems.filter((item) => {
      const name = (item.name ?? '').toLowerCase();
      const sku = (item.sku ?? '').toLowerCase();
      return name.includes(q) || sku.includes(q);
    });
  });

  async function submit(): Promise<void> {
    saving = true;
    formError = null;
    try {
      if (isConnectionMode) {
        const normalizedSeller = normalizeAddressInput(seller);
        if (!normalizedSeller) { formError = 'Please provide a valid seller address.'; return; }
        if (!wcBaseUrl) {
          formError = 'WC store URL is required.';
          return;
        }
        if (!connection && (!wcConsumerKey || !wcConsumerSecret)) {
          formError = 'Consumer key and consumer secret are required when creating a new connection.';
          return;
        }
        await onSubmit({
          connection: {
            chainId,
            seller: normalizedSeller,
            wcBaseUrl: wcBaseUrl.trim().replace(/\/$/, ''),
            wcConsumerKey: wcConsumerKey.trim(),
            wcConsumerSecret: wcConsumerSecret.trim(),
            orderStatus: orderStatus.trim() || 'pending',
            timeoutMs,
            fulfillInheritRequestAbort,
            enabled: connectionEnabled,
          },
        });
        return;
      }

      if (!selectedConnection) { formError = 'Select a WooCommerce connection first.'; return; }

      const normalizedSeller = normalizeAddressInput(selectedConnection.seller);
      if (!normalizedSeller) { formError = 'Selected connection has an invalid seller address.'; return; }

      const normalizedSku = normalizeSku(sku);
      if (!normalizedSku) { formError = 'Please provide a valid SKU.'; return; }

      if (!wcProductSku.trim()) { formError = 'WooCommerce product SKU is required.'; return; }

      await onSubmit({
        type: 'woocommerce',
        wc: {
          chainId,
          seller: normalizedSeller,
          sku: normalizedSku,
          wcProductSku: wcProductSku.trim(),
          enabled: productEnabled,
        },
      });
    } catch (error) {
      formError = error instanceof Error ? error.message : String(error);
    } finally {
      saving = false;
    }
  }
</script>

<AdminProductFormBase
  title={
    isConnectionMode
      ? connection ? 'Edit WooCommerce connection' : 'Create WooCommerce connection'
      : product ? 'Edit WooCommerce product' : 'Create WooCommerce product'
  }
  subtitle={
    isConnectionMode
      ? 'Store WooCommerce REST API credentials for a seller. Products can be added after.'
      : 'Map a marketplace SKU to a WooCommerce product SKU.'
  }
  onSubmit={submit}
  onCancel={onCancel}
  loading={saving}
  submitLabel={
    isConnectionMode
      ? connection ? 'Save connection' : 'Create connection'
      : product ? 'Save changes' : 'Create product'
  }
>
  {#if formError}
    <p class="text-error text-sm">{formError}</p>
  {/if}

  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
    <label class="form-control">
      <span class="label-text">Seller address *</span>
      <input
        type="text"
        class="input input-bordered input-sm font-mono"
        bind:value={seller}
        placeholder="0x..."
        disabled={!isConnectionMode && hasConnectionChoice}
      />
    </label>
    {#if isProductMode}
      <label class="form-control">
        <span class="label-text">SKU *</span>
        <input
          type="text"
          class="input input-bordered input-sm font-mono"
          bind:value={sku}
          placeholder="my-product-001"
          disabled={!!product}
        />
      </label>
    {/if}
  </div>

  {#if isProductMode && hasConnectionChoice}
    <div class="divider text-xs">Connection</div>
    <label class="form-control">
      <span class="label-text">Use existing connection</span>
      <select class="select select-bordered select-sm" bind:value={selectedConnectionKey} disabled={!!product}>
        <option value="" disabled={needsConnectionSelection}>Select connection</option>
        {#each connectionOptions as option (option.key)}
          <option value={option.key}>{option.label}</option>
        {/each}
      </select>
    </label>
  {/if}

  {#if isConnectionMode}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <label class="form-control md:col-span-2">
        <span class="label-text">WooCommerce store URL *</span>
        <input
          class="input input-bordered input-sm"
          bind:value={wcBaseUrl}
          placeholder="https://shop.example.com"
        />
      </label>
      <label class="form-control">
        <span class="label-text">Consumer key *</span>
        <input
          type="password"
          class="input input-bordered input-sm font-mono"
          bind:value={wcConsumerKey}
          placeholder="ck_..."
          autocomplete="new-password"
        />
      </label>
      <label class="form-control">
        <span class="label-text">Consumer secret *</span>
        <input
          type="password"
          class="input input-bordered input-sm font-mono"
          bind:value={wcConsumerSecret}
          placeholder="cs_..."
          autocomplete="new-password"
        />
      </label>
      <label class="form-control">
        <span class="label-text">Order status</span>
        <input
          class="input input-bordered input-sm"
          bind:value={orderStatus}
          placeholder="pending"
        />
        <span class="label-text-alt text-xs opacity-70">WC order status set on fulfillment.</span>
      </label>
      <label class="form-control">
        <span class="label-text">Timeout (ms)</span>
        <input type="number" class="input input-bordered input-sm" bind:value={timeoutMs} min="1000" />
      </label>
      <label class="form-control">
        <span class="label-text">Inherit request abort</span>
        <input type="checkbox" class="checkbox checkbox-sm" bind:checked={fulfillInheritRequestAbort} />
      </label>
      <label class="form-control">
        <span class="label-text">Enabled</span>
        <input type="checkbox" class="checkbox checkbox-sm" bind:checked={connectionEnabled} />
      </label>
    </div>

    {#if connection}
      <div class="form-control">
        <span class="label-text text-xs opacity-70">
          Consumer key on file: <span class="font-mono">{connection.wcConsumerKey}</span>
        </span>
        <span class="label-text-alt text-xs opacity-50">
          Leave key/secret blank to keep existing credentials (re-enter both to rotate).
        </span>
      </div>
    {/if}
  {:else}
    <!-- Product mode -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <label class="form-control">
        <span class="label-text">WooCommerce product SKU *</span>
        <div class="dropdown dropdown-bottom w-full" class:dropdown-open={catalogOpen}>
          <input
            class="input input-bordered input-sm font-mono w-full"
            bind:value={wcProductSku}
            placeholder="Select from catalog or paste SKU"
            onfocus={async () => {
              catalogOpen = true;
              if (selectedConnection && catalogItems.length === 0 && !catalogLoading) {
                await loadCatalogPage(true);
              }
            }}
            onblur={() => {
              setTimeout(() => { catalogOpen = false; }, 150);
            }}
          />
          {#if catalogOpen}
            <div class="dropdown-content z-[50] card card-compact w-full bg-base-100 shadow border border-base-300 mt-1">
              <div class="card-body gap-2">
                <input
                  class="input input-bordered input-xs"
                  bind:value={catalogSearch}
                  placeholder="Search by name or SKU"
                />
                {#if !selectedConnection}
                  <p class="text-xs text-warning">Select a connection first.</p>
                {:else if catalogError}
                  <p class="text-xs text-error break-words">{catalogError}</p>
                {:else if catalogLoading && catalogItems.length === 0}
                  <p class="text-xs opacity-70">Loading…</p>
                {:else if filteredCatalogItems.length === 0}
                  <p class="text-xs opacity-70">No matches found.</p>
                {:else}
                  <div class="max-h-64 overflow-auto">
                    <ul class="menu menu-sm bg-base-100 w-full">
                      {#each filteredCatalogItems.slice(0, 100) as item (item.id)}
                        <li>
                          <button
                            type="button"
                            class="justify-between"
                            onclick={() => {
                              if (!item.sku) return;
                              wcProductSku = item.sku;
                              catalogSearch = '';
                              catalogOpen = false;
                            }}
                          >
                            <span class="flex flex-col items-start">
                              <span class="font-mono">{item.sku || '(no sku)'}</span>
                              <span class="text-xs opacity-70">{item.name}</span>
                            </span>
                            <span class="text-xs opacity-70">{item.stock_quantity ?? '–'}</span>
                          </button>
                        </li>
                      {/each}
                    </ul>
                  </div>
                  {#if catalogHasMore}
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs"
                      disabled={catalogLoading}
                      onclick={async () => { await loadCatalogPage(false); }}
                    >
                      {catalogLoading ? 'Loading…' : 'Load more'}
                    </button>
                  {/if}
                {/if}
              </div>
            </div>
          {/if}
        </div>
        <span class="label-text-alt text-xs opacity-70">Must match the SKU in WooCommerce.</span>
      </label>
      <label class="form-control">
        <span class="label-text">Store URL</span>
        <input class="input input-bordered input-sm" bind:value={wcBaseUrl} disabled={true} />
      </label>
      <label class="form-control">
        <span class="label-text">Order status</span>
        <input class="input input-bordered input-sm" bind:value={orderStatus} disabled={true} />
      </label>
      <label class="form-control">
        <span class="label-text">Product enabled</span>
        <input type="checkbox" class="checkbox checkbox-sm" bind:checked={productEnabled} />
      </label>
    </div>

    {#if needsConnectionSelection}
      <p class="text-xs text-warning">
        Select a WooCommerce connection first. You can create one from the WooCommerce connections section.
      </p>
    {/if}
  {/if}

  {#if product && onDisable}
    <div class="divider text-xs">Danger zone</div>
    <button
      type="button"
      class="btn btn-outline btn-error btn-sm"
      onclick={async () => {
        saving = true;
        formError = null;
        try { await onDisable?.(); }
        catch (e) { formError = e instanceof Error ? e.message : String(e); }
        finally { saving = false; }
      }}
      disabled={saving}
    >
      Disable product
    </button>
  {/if}

  {#if isConnectionMode && connection && onDisable}
    <div class="divider text-xs">Danger zone</div>
    <button
      type="button"
      class="btn btn-outline btn-error btn-sm"
      onclick={async () => {
        saving = true;
        formError = null;
        try { await onDisable?.(); }
        catch (e) { formError = e instanceof Error ? e.message : String(e); }
        finally { saving = false; }
      }}
      disabled={saving}
    >
      Disable connection
    </button>
  {/if}
</AdminProductFormBase>
