<script lang="ts">
  import AdminProductFormBase from './AdminProductFormBase.svelte';
  import type { AdminProductType, AdminUnifiedProduct, AdminOdooConnection } from '../types';
  import type { OdooConnectionConfig, OdooProductConfig, RouteUpsertInput } from '$lib/gateway/adminClient';
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
  let connectionEnabled: boolean = $state(connection?.enabled ?? true);

  let saving = $state(false);
  let formError: string | null = $state(null);

  const connectionOptions = $derived.by(() =>
    connections.map((item) => ({
      key: `${chainId}:${item.seller.toLowerCase()}`,
      label: `${item.odooDb} · ${item.seller.toLowerCase()}`,
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

      await onSubmit({ type: 'odoo', odoo });
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
    {#if !isConnectionMode}
      <label class="form-control">
        <span class="label-text">SKU *</span>
        <input
          type="text"
          class="input input-bordered input-sm font-mono"
          bind:value={sku}
          placeholder="voucher-10"
        />
      </label>
    {/if}
  </div>

  {#if !isConnectionMode && hasConnectionChoice}
    <div class="divider text-xs">Connection</div>
    <label class="form-control">
      <span class="label-text">Use existing connection</span>
      <select class="select select-bordered select-sm" bind:value={selectedConnectionKey}>
        <option value="" disabled={needsConnectionSelection}>Select connection</option>
        {#each connectionOptions as option (option.key)}
          <option value={option.key}>{option.label}</option>
        {/each}
      </select>
      <span class="label-text-alt text-xs opacity-70">Odoo products require a connection.</span>
    </label>
  {/if}

  <div class="divider text-xs">Odoo connection</div>
  {#if isConnectionMode}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <label class="form-control">
        <span class="label-text">Odoo URL *</span>
        <input class="input input-bordered input-sm" bind:value={odooUrl} placeholder="https://your-odoo" />
      </label>
      <label class="form-control">
        <span class="label-text">Database *</span>
        <input class="input input-bordered input-sm" bind:value={odooDb} />
      </label>
      <label class="form-control">
        <span class="label-text">UID *</span>
        <input type="number" class="input input-bordered input-sm" bind:value={odooUid} />
      </label>
      <label class="form-control">
        <span class="label-text">API key *</span>
        <input type="password" class="input input-bordered input-sm" bind:value={odooKey} />
      </label>
      <label class="form-control">
        <span class="label-text">Sale partner ID</span>
        <input
          type="number"
          class="input input-bordered input-sm"
          bind:value={salePartnerId}
        />
      </label>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <label class="form-control">
        <span class="label-text">JSON-RPC timeout (ms)</span>
        <input
          type="number"
          class="input input-bordered input-sm"
          bind:value={jsonrpcTimeoutMs}
          min="1000"
        />
      </label>
      <label class="form-control">
        <span class="label-text">Fulfill inherit request abort</span>
        <input type="checkbox" class="checkbox checkbox-sm" bind:checked={fulfillInheritRequestAbort} />
      </label>
      <label class="form-control">
        <span class="label-text">Connection enabled</span>
        <input type="checkbox" class="checkbox checkbox-sm" bind:checked={connectionEnabled} />
      </label>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <label class="form-control">
        <span class="label-text">Odoo product code *</span>
        <input class="input input-bordered input-sm font-mono" bind:value={odooProductCode} />
      </label>
      <label class="form-control">
        <span class="label-text">Connection URL</span>
        <input class="input input-bordered input-sm" bind:value={odooUrl} disabled={true} />
      </label>
      <label class="form-control">
        <span class="label-text">Database</span>
        <input class="input input-bordered input-sm" bind:value={odooDb} disabled={true} />
      </label>
      <label class="form-control">
        <span class="label-text">UID</span>
        <input type="number" class="input input-bordered input-sm" bind:value={odooUid} disabled={true} />
      </label>
      <label class="form-control">
        <span class="label-text">Sale partner ID</span>
        <input type="number" class="input input-bordered input-sm" bind:value={salePartnerId} disabled={true} />
      </label>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <label class="form-control">
        <span class="label-text">JSON-RPC timeout (ms)</span>
        <input type="number" class="input input-bordered input-sm" bind:value={jsonrpcTimeoutMs} disabled={true} />
      </label>
      <label class="form-control">
        <span class="label-text">Fulfill inherit request abort</span>
        <input type="checkbox" class="checkbox checkbox-sm" bind:checked={fulfillInheritRequestAbort} disabled={true} />
      </label>
      <label class="form-control">
        <span class="label-text">Product enabled</span>
        <input type="checkbox" class="checkbox checkbox-sm" bind:checked={odooEnabled} />
      </label>
    </div>
  {/if}

  {#if !isConnectionMode && needsConnectionSelection}
    <p class="text-xs text-warning">
      Select a connection first. You can create a new connection from the Odoo connections section.
    </p>
  {/if}

  {#if product && onDisable}
    <div class="divider text-xs">Danger zone</div>
    <button
      type="button"
      class="btn btn-outline btn-error btn-sm"
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
    <div class="divider text-xs">Danger zone</div>
    <button
      type="button"
      class="btn btn-outline btn-error btn-sm"
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