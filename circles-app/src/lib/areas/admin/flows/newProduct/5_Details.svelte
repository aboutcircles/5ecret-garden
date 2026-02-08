<script lang="ts">
  import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
  import type { Address } from '@circles-sdk/utils';
  import { popupControls } from '$lib/shared/state/popup';
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
    if (context.selectedConnectionKey == null) context.selectedConnectionKey = '';
  });

  $effect(() => {
    if ((context.selectedType ?? 'codedispenser') !== 'codedispenser') return;
    const seller = normalizedSeller ? String(normalizedSeller) : '';
    const sku = normalizedSku || '';
    if (!seller || !sku) return;
    context.poolId = `${seller}/${sku}`;
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
    const odoo = {
      chainId: context.chainId,
      seller: normalizedSeller,
      sku: normalizedSku,
      odooProductCode: (context.odooProductCode ?? '').trim(),
      enabled: Boolean(context.enabled),
    };
    return { type: 'odoo', route, odoo };
  }

  function goNext(): void {
    const payload = buildPayload();
    if (!payload) return;
    const title = (context.selectedType ?? 'codedispenser') === 'odoo'
      ? 'Use odoo product'
      : 'Add codes';
    popupControls.open({
      title,
      component: SummaryStep,
      props: { context, connections, existingProducts, onExecute, onCreateConnection },
      id: 'admin-new-product-summary',
    });
  }
</script>

<div class="space-y-3">
  {#if formError}
    <p class="text-error text-sm">{formError}</p>
  {/if}

  {#if (context.selectedType ?? 'codedispenser') === 'codedispenser'}
    <label class="form-control">
      <span class="label-text">Seed codes (one per line)</span>
      <textarea class="textarea textarea-bordered textarea-sm font-mono" rows="3" bind:value={context.codesTextarea}></textarea>
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
  {:else}
    <label class="form-control">
      <span class="label-text">Odoo connection *</span>
      <select class="select select-bordered select-sm" bind:value={context.selectedConnectionKey}>
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
  {/if}

  <div class="flex justify-end">
    <button class="btn btn-primary btn-sm" type="button" onclick={goNext}>Review</button>
  </div>
</div>
