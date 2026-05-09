<script lang="ts">
  import AdminProductFormBase from './AdminProductFormBase.svelte';
  import type { AdminProductType, AdminUnifiedProduct, AdminOdooConnection } from '../types';
  import { T } from '$lib/design-system/tokens.js';
  import {
    listOdooProductCatalog,
    type OdooConnectionConfig,
    type OdooStockConfig,
    type OdooProductCatalogItem,
    type OdooProductConfig,
    type RouteUpsertInput,
  } from '$lib/areas/admin/services/gateway/adminClient';
  import { normalizeAddressInput, normalizeSku } from '../productEditorUtils';

  interface Props {
    product?: AdminUnifiedProduct | null;
    connection?: AdminOdooConnection | null;
    connections?: AdminOdooConnection[];
    mode?: 'connection' | 'product';
    onSubmit: (payload: {
      type?: AdminProductType;
      route?: RouteUpsertInput;
      odoo?: OdooProductConfig;
      odooStock?: OdooStockConfig;
      connection?: OdooConnectionConfig;
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
  let seller: string = $state(product?.seller ?? connection?.seller ?? '');
  let sku: string = $state(product?.sku ?? '');

  let odooProductCode: string = $state(product?.odoo?.odooProductCode ?? '');
  let selectedConnectionKey: string = $state(
    connection
      ? `${chainId}:${connection.seller.toLowerCase()}`
      : product
        ? `${chainId}:${product.seller.toLowerCase()}`
        : ''
  );
  let odooUrl: string = $state(connection?.odooUrl ?? '');
  let odooDb: string = $state(connection?.odooDb ?? '');
  let odooUid: number = $state(connection?.odooUid ?? 0);
  let odooKey: string = $state('');
  let salePartnerId: number | null = $state(connection?.salePartnerId ?? null);
  let jsonrpcTimeoutMs: number = $state(connection?.jsonrpcTimeoutMs ?? 30000);
  let fulfillInheritRequestAbort: boolean = $state(connection?.fulfillInheritRequestAbort ?? false);
  let odooEnabled: boolean = $state(product?.odoo?.enabled ?? true);
  let localStockEnabled: boolean = $state(product?.odoo?.localAvailableQty != null);
  let localAvailableQtyInput: string = $state(
    product?.odoo?.localAvailableQty != null ? String(product.odoo.localAvailableQty) : ''
  );
  let connectionEnabled: boolean = $state(connection?.enabled ?? true);

  let saving = $state(false);
  let formError: string | null = $state(null);

  // Odoo catalog search (for product mode)
  let catalogSearch = $state('');
  let catalogOpen = $state(false);
  let catalogLoading = $state(false);
  let catalogError = $state<string | null>(null);
  let catalogItems = $state<OdooProductCatalogItem[]>([]);
  let catalogOffset = $state(0);
  const catalogLimit = 200;
  let catalogHasMore = $state(false);

  async function loadCatalogPage(reset: boolean): Promise<void> {
    if (!selectedConnection) return;
    catalogLoading = true;
    catalogError = null;
    try {
      const offset = reset ? 0 : catalogOffset;
      const r = await listOdooProductCatalog({
        chainId,
        seller: selectedConnection.seller,
        limit: catalogLimit,
        offset,
        activeOnly: true,
        hasCode: true,
      });
      if (reset) {
        catalogItems = r.items;
        catalogOffset = r.items.length;
      } else {
        catalogItems = [...catalogItems, ...r.items];
        catalogOffset = catalogOffset + r.items.length;
      }
      catalogHasMore = r.items.length === catalogLimit;
    } catch (e) {
      catalogError = e instanceof Error ? e.message : 'Failed to load Odoo product catalog.';
    } finally {
      catalogLoading = false;
    }
  }

  const connectionOptions = $derived.by(() =>
    connections.map((item) => ({
      key: `${chainId}:${item.seller.toLowerCase()}`,
      label: `${item.odooUrl} · ${item.odooDb}`,
      connection: item,
    }))
  );

  const selectedConnection = $derived(
    connectionOptions.find((option) => option.key === selectedConnectionKey)?.connection ?? null
  );

  const isConnectionMode = $derived(mode === 'connection');
  const isProductMode = $derived(mode === 'product');
  const needsConnectionSelection = $derived(isProductMode && !selectedConnection);
  const hasConnectionChoice = $derived(connectionOptions.length > 0);

  $effect(() => {
    if (!isProductMode || !selectedConnection) return;
    seller = selectedConnection.seller;
    odooUrl = selectedConnection.odooUrl;
    odooDb = selectedConnection.odooDb;
    odooUid = selectedConnection.odooUid;
    salePartnerId = selectedConnection.salePartnerId ?? null;
    jsonrpcTimeoutMs = selectedConnection.jsonrpcTimeoutMs ?? 30000;
    fulfillInheritRequestAbort = selectedConnection.fulfillInheritRequestAbort ?? false;
    connectionEnabled = selectedConnection.enabled;

    // Reset catalog state when switching connection.
    catalogSearch = '';
    catalogOpen = false;
    catalogItems = [];
    catalogOffset = 0;
    catalogHasMore = false;
    catalogError = null;

    void loadCatalogPage(true);
  });

  const filteredCatalogItems = $derived.by(() => {
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return catalogItems;
    return catalogItems.filter((item) => {
      const code = (item.default_code ?? '').toLowerCase();
      const name = (item.display_name ?? '').toLowerCase();
      const barcode = (item.barcode ?? '').toLowerCase();
      const tmpl = (item.product_tmpl_id?.[1] ?? '').toLowerCase();
      return code.includes(q) || name.includes(q) || barcode.includes(q) || tmpl.includes(q);
    });
  });

  async function submit(): Promise<void> {
    saving = true;
    formError = null;
    try {
      if (isConnectionMode) {
        const normalizedSeller = normalizeAddressInput(seller);
        if (!normalizedSeller) {
          formError = 'Please provide a valid seller address.';
          return;
        }

        if (!odooUrl || !odooDb || !odooKey) {
          formError = 'Fill all required Odoo connection fields.';
          return;
        }

        const connectionPayload: OdooConnectionConfig = {
          chainId,
          seller: normalizedSeller,
          odooUrl: odooUrl.trim(),
          odooDb: odooDb.trim(),
          odooUid,
          odooKey: odooKey.trim(),
          salePartnerId: salePartnerId ?? undefined,
          jsonrpcTimeoutMs,
          fulfillInheritRequestAbort,
          enabled: connectionEnabled,
        };

        await onSubmit({ connection: connectionPayload });
        return;
      }

      if (!selectedConnection) {
        formError = 'Select an Odoo connection before creating a product.';
        return;
      }

      const normalizedSeller = normalizeAddressInput(selectedConnection.seller);
      if (!normalizedSeller) {
        formError = 'Selected connection has an invalid seller address.';
        return;
      }

      const normalizedSku = normalizeSku(sku);
      if (!normalizedSku) {
        formError = 'Please provide a valid SKU.';
        return;
      }

      if (!odooProductCode) {
        formError = 'Odoo product code is required.';
        return;
      }

      const odoo: OdooProductConfig = {
        chainId,
        seller: normalizedSeller,
        sku: normalizedSku,
        odooProductCode: odooProductCode.trim(),
        enabled: odooEnabled,
      };
      let odooStock: OdooStockConfig | undefined;
      if (localStockEnabled) {
        const parsed = Number(localAvailableQtyInput);
        if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
          formError = 'Local stock must be a whole number greater than or equal to 0.';
          return;
        }
        odooStock = {
          chainId,
          seller: normalizedSeller,
          sku: normalizedSku,
          availableQty: parsed,
        };
      }

      await onSubmit({ type: 'odoo', odoo, odooStock });
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
      ? connection
        ? 'Edit Odoo connection'
        : 'Create Odoo connection'
      : product
        ? 'Edit Odoo product'
        : 'Create Odoo product'
  }
  subtitle={
    isConnectionMode
      ? 'Store credentials for a seller/chain. Products can be added after the connection exists.'
      : 'Configure the Odoo mapping; routes are handled automatically.'
  }
  onSubmit={submit}
  onCancel={onCancel}
  loading={saving}
  submitLabel={
    isConnectionMode
      ? connection
        ? 'Save connection'
        : 'Create connection'
      : product
        ? 'Save changes'
        : 'Create product'
  }
>
  {#if formError}
    <p style="color:{T.negative};font-size:13px;">{formError}</p>
  {/if}

  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
    <label style="display:flex;flex-direction:column;gap:4px;">
      <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Seller address *</span>
      <input
        type="text"
        style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontMono};outline:none;box-sizing:border-box;width:100%;"
        bind:value={seller}
        placeholder="0x..."
        disabled={!isConnectionMode && hasConnectionChoice}
      />
    </label>
    {#if !isConnectionMode}
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">SKU *</span>
        <input
          type="text"
          style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontMono};outline:none;box-sizing:border-box;width:100%;"
          bind:value={sku}
          placeholder="voucher-10"
        />
      </label>
    {/if}
  </div>

  {#if !isConnectionMode && hasConnectionChoice}
    <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:{T.inkMuted};"><span style="flex:1;height:1px;background:{T.hairlineSoft};"></span>Connection<span style="flex:1;height:1px;background:{T.hairlineSoft};"></span></div>
    <label style="display:flex;flex-direction:column;gap:4px;">
      <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Use existing connection</span>
      <select style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;" bind:value={selectedConnectionKey}>
        <option value="" disabled={needsConnectionSelection}>Select connection</option>
        {#each connectionOptions as option (option.key)}
          <option value={option.key}>{option.label}</option>
        {/each}
      </select>
      <span style="font-size:11px;opacity:0.7;">Odoo products require a connection.</span>
    </label>
  {/if}

  {#if isConnectionMode}
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Odoo URL *</span>
        <input style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;" bind:value={odooUrl} placeholder="https://your-odoo" />
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Database *</span>
        <input style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;" bind:value={odooDb} />
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">UID *</span>
        <input type="number" style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;" bind:value={odooUid} />
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">API key *</span>
        <input type="password" style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;" bind:value={odooKey} />
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Sale partner ID</span>
        <input
          type="number"
          style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;"
          bind:value={salePartnerId}
        />
      </label>
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">JSON-RPC timeout (ms)</span>
        <input
          type="number"
          style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;"
          bind:value={jsonrpcTimeoutMs}
          min="1000"
        />
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Fulfill inherit request abort</span>
        <input type="checkbox" style="width:14px;height:14px;accent-color:{T.primary};" bind:checked={fulfillInheritRequestAbort} />
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Connection enabled</span>
        <input type="checkbox" style="width:14px;height:14px;accent-color:{T.primary};" bind:checked={connectionEnabled} />
      </label>
    </div>
  {:else}
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Odoo product code *</span>
        <div style="position:relative;width:100%;">
          <input
            style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontMono};outline:none;box-sizing:border-box;width:100%;"
            bind:value={odooProductCode}
            placeholder="Select from catalog or paste code"
            onfocus={async () => {
              catalogOpen = true;
              if (selectedConnection && catalogItems.length === 0 && !catalogLoading) {
                await loadCatalogPage(true);
              }
            }}
            onblur={() => {
              // Give clicks on dropdown items a chance to register.
              setTimeout(() => {
                catalogOpen = false;
              }, 150);
            }}
          />

          {#if catalogOpen}
            <div style="position:absolute;z-index:50;width:100%;background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:10px;box-shadow:{T.shadow.xs};margin-top:4px;">
              <div style="padding:10px;display:flex;flex-direction:column;gap:8px;">
                <input
                  style="height:28px;padding:0 8px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;"
                  bind:value={catalogSearch}
                  placeholder="Search by name, code, barcode"
                />

                {#if !selectedConnection}
                  <p style="font-size:11px;color:{T.warning};">Select a connection first.</p>
                {:else if catalogError}
                  <p style="font-size:11px;color:{T.negative};word-break:break-words;">{catalogError}</p>
                {:else if catalogLoading && catalogItems.length === 0}
                  <p style="font-size:11px;opacity:0.7;">Loading…</p>
                {:else if filteredCatalogItems.length === 0}
                  <p style="font-size:11px;opacity:0.7;">No matches in loaded catalog.</p>
                {:else}
                  <div style="max-height:256px;overflow:auto;">
                    <ul style="list-style:none;margin:0;padding:0;width:100%;">
                      {#each filteredCatalogItems.slice(0, 100) as item (item.id)}
                        <li>
                          <button
                            type="button"
                            style="display:flex;justify-content:space-between;align-items:center;width:100%;padding:4px 8px;border:0;background:transparent;cursor:pointer;border-radius:6px;font-family:{T.fontSans};font-size:12px;"
                            onclick={() => {
                              if (!item.default_code) return;
                              odooProductCode = item.default_code;
                              catalogSearch = '';
                              catalogOpen = false;
                            }}
                          >
                            <span style="display:flex;flex-direction:column;align-items:flex-start;">
                              <span style="font-family:{T.fontMono};">{item.default_code}</span>
                              <span style="font-size:11px;opacity:0.7;">{item.display_name}</span>
                            </span>
                            <span style="font-size:11px;opacity:0.7;">{item.qty_available}</span>
                          </button>
                        </li>
                      {/each}
                    </ul>
                  </div>

                  {#if catalogHasMore}
                    <button
                      type="button"
                      style="height:24px;padding:0 10px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};cursor:pointer;font-family:{T.fontSans};font-size:11px;"
                      disabled={catalogLoading}
                      onclick={async () => {
                        await loadCatalogPage(false);
                      }}
                    >
                      {catalogLoading ? 'Loading…' : 'Load more'}
                    </button>
                  {/if}
                {/if}
              </div>
            </div>
          {/if}
        </div>
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Connection URL</span>
        <input style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;" bind:value={odooUrl} disabled={true} />
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Database</span>
        <input style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;" bind:value={odooDb} disabled={true} />
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">UID</span>
        <input type="number" style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;" bind:value={odooUid} disabled={true} />
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Sale partner ID</span>
        <input type="number" style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;" bind:value={salePartnerId} disabled={true} />
      </label>
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">JSON-RPC timeout (ms)</span>
        <input type="number" style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;" bind:value={jsonrpcTimeoutMs} disabled={true} />
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Fulfill inherit request abort</span>
        <input type="checkbox" style="width:14px;height:14px;accent-color:{T.primary};" bind:checked={fulfillInheritRequestAbort} disabled={true} />
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Product enabled</span>
        <input type="checkbox" style="width:14px;height:14px;accent-color:{T.primary};" bind:checked={odooEnabled} />
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Use local stock</span>
        <input type="checkbox" style="width:14px;height:14px;accent-color:{T.primary};" bind:checked={localStockEnabled} />
        <span style="font-size:11px;opacity:0.7;">
          When enabled, checkout availability uses this local counter.
        </span>
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Local available quantity</span>
        <input
          type="number"
          style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;"
          min="0"
          step="1"
          bind:value={localAvailableQtyInput}
          disabled={!localStockEnabled}
          placeholder="e.g. 25"
        />
      </label>
    </div>
  {/if}

  {#if !isConnectionMode && needsConnectionSelection}
    <p style="font-size:11px;color:{T.warning};">
      Select a connection first. You can create a new connection from the Odoo connections section.
    </p>
  {/if}

  {#if product && onDisable}
    <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:{T.inkMuted};"><span style="flex:1;height:1px;background:{T.hairlineSoft};"></span>Danger zone<span style="flex:1;height:1px;background:{T.hairlineSoft};"></span></div>
    <button
      type="button"
      style="height:32px;padding:0 14px;border-radius:9999px;border:1px solid rgba(196,68,48,0.3);background:transparent;color:{T.negative};cursor:pointer;font-family:{T.fontSans};font-size:12.5px;"
      onclick={async () => {
        saving = true;
        try {
          await onDisable?.();
        } finally {
          saving = false;
        }
      }}
      disabled={saving}
    >
      Disable product
    </button>
  {/if}

  {#if isConnectionMode && connection && onDisable}
    <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:{T.inkMuted};"><span style="flex:1;height:1px;background:{T.hairlineSoft};"></span>Danger zone<span style="flex:1;height:1px;background:{T.hairlineSoft};"></span></div>
    <button
      type="button"
      style="height:32px;padding:0 14px;border-radius:9999px;border:1px solid rgba(196,68,48,0.3);background:transparent;color:{T.negative};cursor:pointer;font-family:{T.fontSans};font-size:12.5px;"
      onclick={async () => {
        saving = true;
        try {
          await onDisable?.();
        } finally {
          saving = false;
        }
      }}
      disabled={saving}
    >
      Disable connection
    </button>
  {/if}
</AdminProductFormBase>