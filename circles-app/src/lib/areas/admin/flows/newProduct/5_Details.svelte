<script lang="ts">
  import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
  import type { Address } from '@circles-sdk/utils';
  import { openStep } from '$lib/shared/flow';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import { NEW_PRODUCT_FLOW_SCAFFOLD_BASE } from './constants';
  import StepActionBar from '$lib/shared/ui/flow/StepActionBar.svelte';
  import SummaryStep from './6_Summary.svelte';
  import { listOdooProductCatalog, type OdooProductCatalogItem } from '$lib/areas/admin/services/gateway/adminClient';
  import type { AdminNewProductFlowContext } from './context';
  import type { AdminOdooConnection, AdminUnifiedProduct } from '$lib/areas/admin/types';

  interface Props {
    context: AdminNewProductFlowContext;
    connections: AdminOdooConnection[];
    existingProducts: AdminUnifiedProduct[];
    onExecute: (payload: any) => Promise<void>;
    onCreateConnection: (payload: { connection: any }) => Promise<AdminOdooConnection>;
  }

  let { context, connections, existingProducts, onExecute, onCreateConnection }: Props = $props();

  let formError = $state<string | null>(null);
  let catalogLoading = $state(false);
  let catalogError = $state<string | null>(null);
  let catalogItems = $state<OdooProductCatalogItem[]>([]);

  const normalizedSeller = $derived(
    context.seller ? (normalizeAddress(String(context.seller)) as Address) : undefined
  );
  const normalizedSku = $derived((context.catalogItem?.product?.sku ?? '').trim());

  const sellerConnections = $derived.by(() => {
    if (!normalizedSeller) return [];
    const s = normalizedSeller.toLowerCase();
    return (connections ?? []).filter((c) => String(c.seller).toLowerCase() === s);
  });

  const selectedConnection = $derived(
    sellerConnections.find((c) => `${context.chainId}:${String(c.seller).toLowerCase()}` === (context.selectedConnectionKey ?? '')) ?? null
  );

  $effect(() => {
    if (context.enabled == null) context.enabled = true;
    if (context.poolId == null) context.poolId = '';
    if (context.downloadUrlTemplate == null) context.downloadUrlTemplate = '';
    if (context.codesTextarea == null) context.codesTextarea = '';
    if (context.odooProductCode == null) context.odooProductCode = '';
    if (context.useLocalStock == null) context.useLocalStock = false;
    if (context.localAvailableQty == null) context.localAvailableQty = null;
    if (context.selectedConnectionKey == null) context.selectedConnectionKey = '';
    if (context.lockAddress == null) context.lockAddress = '';
    if (context.rpcUrl == null) context.rpcUrl = '';
    if (context.servicePrivateKey == null) context.servicePrivateKey = '';
    if (context.unlockTimingMode == null) context.unlockTimingMode = 'duration';
    if (context.durationSeconds == null) context.durationSeconds = 86400;
    if (context.expirationUnix == null) context.expirationUnix = null;
    if (context.keyManagerMode == null) context.keyManagerMode = 'buyer';
    if (context.fixedKeyManager == null) context.fixedKeyManager = '';
    if (context.locksmithBase == null) context.locksmithBase = 'https://locksmith.unlock-protocol.com';
    if (context.locksmithToken == null) context.locksmithToken = '';
    if (context.totalInventory == null) context.totalInventory = 0;
  });

  $effect(() => {
    if ((context.selectedType ?? 'codedispenser') !== 'codedispenser') return;
    const seller = normalizedSeller ? String(normalizedSeller) : '';
    const sku = normalizedSku || '';
    if (!seller || !sku) return;
    context.poolId = `${seller}-${sku}`;
  });

  $effect(() => {
    if (context.selectedType !== 'odoo') return;
    if (!selectedConnection) {
      catalogItems = [];
      catalogError = null;
      return;
    }

    catalogLoading = true;
    catalogError = null;
    catalogItems = [];

    listOdooProductCatalog({
      chainId: context.chainId,
      seller: selectedConnection.seller,
      limit: 200,
      offset: 0,
      activeOnly: true,
      hasCode: true,
    })
      .then((r) => {
        catalogItems = r.items;
      })
      .catch((e) => {
        catalogError = e instanceof Error ? e.message : 'Failed to load Odoo product catalog.';
      })
      .finally(() => {
        catalogLoading = false;
      });
  });

  function parseCodes(): string[] | undefined {
    const codes = (context.codesTextarea ?? '')
      .split('\n')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    return codes.length > 0 ? codes : undefined;
  }

  function buildPayload(): any | null {
    formError = null;
    if (!normalizedSeller) {
      formError = 'Seller is required.';
      return null;
    }
    if (!normalizedSku) {
      formError = 'SKU is required.';
      return null;
    }
    const selectedType = context.selectedType ?? 'codedispenser';

    const route = {
      chainId: context.chainId,
      seller: normalizedSeller,
      sku: normalizedSku,
      offerType: selectedType,
      isOneOff: false,
      enabled: true,
    };

    if (selectedType === 'codedispenser') {
      const rawCodes = (context.codesTextarea ?? '').split('\n');
      for (const code of rawCodes) {
        const trimmedEnd = code.replace(/\s+$/, '');
        if (trimmedEnd.length > 0 && /\s/.test(trimmedEnd)) {
          formError = 'Codes cannot contain whitespace (only trailing spaces are allowed).';
          return null;
        }
      }
      const code = {
        chainId: context.chainId,
        seller: normalizedSeller,
        sku: normalizedSku,
        poolId: (context.poolId ?? '').trim(),
        downloadUrlTemplate: (context.downloadUrlTemplate ?? '').trim() || undefined,
        codes: parseCodes(),
        enabled: Boolean(context.enabled),
      };
      return { type: 'codedispenser', route, code };
    }

    if (selectedType === 'unlock') {
      const lockAddress = normalizeAddress(String(context.lockAddress ?? '')) as Address | undefined;
      if (!lockAddress) {
        formError = 'Lock address is required.';
        return null;
      }
      if (!(context.rpcUrl ?? '').trim()) {
        formError = 'RPC URL is required.';
        return null;
      }
      if (!(context.servicePrivateKey ?? '').trim()) {
        formError = 'Service private key is required.';
        return null;
      }
      const totalInventory = context.totalInventory;
      if (totalInventory == null || !Number.isInteger(totalInventory) || totalInventory < 0) {
        formError = 'Total inventory must be a whole number greater than or equal to 0.';
        return null;
      }

      let durationSeconds: number | undefined;
      let expirationUnix: number | undefined;
      if ((context.unlockTimingMode ?? 'duration') === 'duration') {
        const duration = context.durationSeconds;
        if (duration == null || !Number.isInteger(duration) || duration < 0) {
          formError = 'Duration seconds must be a whole number greater than or equal to 0.';
          return null;
        }
        durationSeconds = duration;
      } else {
        const expiration = context.expirationUnix;
        if (expiration == null || !Number.isInteger(expiration) || expiration < 0) {
          formError = 'Expiration unix must be a whole number greater than or equal to 0.';
          return null;
        }
        expirationUnix = expiration;
      }

      let fixedKeyManager: Address | undefined;
      if ((context.keyManagerMode ?? 'buyer') === 'fixed') {
        fixedKeyManager = normalizeAddress(String(context.fixedKeyManager ?? '')) as Address | undefined;
        if (!fixedKeyManager) {
          formError = 'Fixed key manager is required for fixed key manager mode.';
          return null;
        }
      }

      const unlock = {
        chainId: context.chainId,
        seller: normalizedSeller,
        sku: normalizedSku,
        lockAddress,
        rpcUrl: (context.rpcUrl ?? '').trim(),
        servicePrivateKey: (context.servicePrivateKey ?? '').trim(),
        durationSeconds,
        expirationUnix,
        keyManagerMode: context.keyManagerMode ?? 'buyer',
        fixedKeyManager,
        locksmithBase: (context.locksmithBase ?? '').trim() || undefined,
        locksmithToken: (context.locksmithToken ?? '').trim() || undefined,
        totalInventory,
        enabled: Boolean(context.enabled),
      };
      return { type: 'unlock', route, unlock };
    }

    const key = context.selectedConnectionKey ?? '';
    const selectedConnection = sellerConnections.find((c) => `${context.chainId}:${String(c.seller).toLowerCase()}` === key) ?? null;
    if (!selectedConnection) {
      formError = 'Select an existing Odoo connection for this seller.';
      return null;
    }
    if (!(context.odooProductCode ?? '').trim()) {
      formError = 'Odoo product code is required.';
      return null;
    }

    let odooStock: {
      chainId: number;
      seller: Address;
      sku: string;
      availableQty: number;
    } | undefined;

    if (Boolean(context.useLocalStock)) {
      const qty = context.localAvailableQty;
      if (qty == null || !Number.isInteger(qty) || qty < 0) {
        formError = 'Local stock quantity must be a whole number greater than or equal to 0.';
        return null;
      }
      odooStock = {
        chainId: context.chainId,
        seller: normalizedSeller,
        sku: normalizedSku,
        availableQty: qty,
      };
    }

    const odoo = {
      chainId: context.chainId,
      seller: normalizedSeller,
      sku: normalizedSku,
      odooProductCode: (context.odooProductCode ?? '').trim(),
      enabled: Boolean(context.enabled),
    };
    return { type: 'odoo', route, odoo, odooStock };
  }

  function goNext(): void {
    const payload = buildPayload();
    if (!payload) return;
    const title = (context.selectedType ?? 'codedispenser') === 'odoo'
      ? 'Use odoo product'
      : (context.selectedType ?? 'codedispenser') === 'unlock'
        ? 'Configure unlock'
      : 'Add codes';
    openStep({
      title,
      component: SummaryStep,
      props: { context, connections, existingProducts, onExecute, onCreateConnection },
      key: 'admin-new-product-summary',
    });
  }
</script>

<FlowStepScaffold
  {...NEW_PRODUCT_FLOW_SCAFFOLD_BASE}
  step={5}
  title="Details"
  subtitle="Configure fulfillment details before review."
>

    {#if formError}
      <StepAlert variant="error" message={formError} />
    {/if}

    {#if (context.selectedType ?? 'codedispenser') === 'codedispenser'}
      <label class="form-control">
        <span class="label-text">Seed codes (one per line)</span>
        <textarea class="textarea textarea-bordered textarea-sm font-mono" rows="3" bind:value={context.codesTextarea} data-popup-initial-input></textarea>
      </label>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label class="form-control">
          <span class="label-text">Download URL template</span>
          <input
            class="input input-bordered input-sm"
            bind:value={context.downloadUrlTemplate}
            placeholder={`https://example.com/${'{code}'}`}
          />
          <span class="label-text-alt text-xs opacity-70">Use &lbrace;code&rbrace; as placeholder</span>
        </label>
        <label class="form-control">
          <span class="label-text">Enabled</span>
          <input type="checkbox" class="checkbox checkbox-sm" bind:checked={context.enabled} />
        </label>
      </div>
    {:else if (context.selectedType ?? 'codedispenser') === 'unlock'}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label class="form-control">
          <span class="label-text">Lock address *</span>
          <input class="input input-bordered input-sm font-mono" bind:value={context.lockAddress} placeholder="0x..." data-popup-initial-input />
        </label>
        <label class="form-control">
          <span class="label-text">RPC URL *</span>
          <input class="input input-bordered input-sm" bind:value={context.rpcUrl} placeholder="https://rpc.gnosischain.com" />
        </label>
        <label class="form-control md:col-span-2">
          <span class="label-text">Service private key *</span>
          <input class="input input-bordered input-sm font-mono" type="password" bind:value={context.servicePrivateKey} placeholder="0x..." />
        </label>
        <label class="form-control">
          <span class="label-text">Timing mode</span>
          <select class="select select-bordered select-sm" bind:value={context.unlockTimingMode}>
            <option value="duration">Duration seconds</option>
            <option value="expiration">Expiration unix</option>
          </select>
        </label>
        {#if (context.unlockTimingMode ?? 'duration') === 'duration'}
          <label class="form-control">
            <span class="label-text">Duration seconds *</span>
            <input type="number" class="input input-bordered input-sm" bind:value={context.durationSeconds} min="0" step="1" />
          </label>
        {:else}
          <label class="form-control">
            <span class="label-text">Expiration unix *</span>
            <input type="number" class="input input-bordered input-sm" bind:value={context.expirationUnix} min="0" step="1" />
          </label>
        {/if}
        <label class="form-control">
          <span class="label-text">Key manager mode</span>
          <select class="select select-bordered select-sm" bind:value={context.keyManagerMode}>
            <option value="buyer">buyer</option>
            <option value="service">service</option>
            <option value="fixed">fixed</option>
          </select>
        </label>
        <label class="form-control">
          <span class="label-text">Fixed key manager</span>
          <input
            class="input input-bordered input-sm font-mono"
            bind:value={context.fixedKeyManager}
            placeholder="0x..."
            disabled={(context.keyManagerMode ?? 'buyer') !== 'fixed'}
          />
        </label>
        <label class="form-control">
          <span class="label-text">Locksmith base</span>
          <input class="input input-bordered input-sm" bind:value={context.locksmithBase} placeholder="https://locksmith.unlock-protocol.com" />
        </label>
        <label class="form-control">
          <span class="label-text">Locksmith token</span>
          <input class="input input-bordered input-sm" type="password" bind:value={context.locksmithToken} placeholder="optional" />
        </label>
        <label class="form-control">
          <span class="label-text">Total inventory *</span>
          <input type="number" class="input input-bordered input-sm" bind:value={context.totalInventory} min="0" step="1" />
        </label>
        <label class="form-control">
          <span class="label-text">Enabled</span>
          <input type="checkbox" class="checkbox checkbox-sm" bind:checked={context.enabled} />
        </label>
      </div>
    {:else}
      <label class="form-control">
        <span class="label-text">Odoo connection *</span>
        <select class="select select-bordered select-sm" bind:value={context.selectedConnectionKey} data-popup-initial-input>
          <option value="" disabled={true}>Select connection</option>
          {#each sellerConnections as c (`${c.chainId}:${String(c.seller).toLowerCase()}`)}
            <option value={`${c.chainId}:${String(c.seller).toLowerCase()}`}>{c.odooUrl} · {c.odooDb}</option>
          {/each}
        </select>
        {#if sellerConnections.length === 0}
          <span class="label-text-alt text-xs text-warning">
            No Odoo connection found for this seller.
          </span>
        {/if}
      </label>
      <label class="form-control">
        <span class="label-text">Odoo product code *</span>
        <select
          class="select select-bordered select-sm font-mono"
          bind:value={context.odooProductCode}
          disabled={!selectedConnection || catalogLoading}
        >
          <option value="" disabled={true}>Select product code</option>
          {#each catalogItems as item (item.id)}
            {#if item.default_code}
              <option value={item.default_code}>
                {item.default_code} · {item.display_name}
              </option>
            {/if}
          {/each}
        </select>
        {#if catalogLoading}
          <span class="label-text-alt text-xs opacity-70">Loading catalog…</span>
        {:else if catalogError}
          <span class="label-text-alt text-xs text-error break-words">
            {catalogError}
          </span>
        {:else if selectedConnection && catalogItems.length === 0}
          <span class="label-text-alt text-xs text-warning">No products found for this connection.</span>
        {/if}
      </label>
      <label class="form-control">
        <span class="label-text">Use local stock</span>
        <input type="checkbox" class="checkbox checkbox-sm" bind:checked={context.useLocalStock} />
      </label>
      <label class="form-control">
        <span class="label-text">Local available quantity</span>
        <input
          type="number"
          class="input input-bordered input-sm"
          bind:value={context.localAvailableQty}
          min="0"
          step="1"
          disabled={!context.useLocalStock}
          placeholder="e.g. 25"
        />
      </label>
    {/if}

    <StepActionBar>
      {#snippet primary()}
        <button class="btn btn-primary btn-sm" type="button" onclick={goNext}>Review</button>
      {/snippet}
    </StepActionBar>
  </FlowStepScaffold>
