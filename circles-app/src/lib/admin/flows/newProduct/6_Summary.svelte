<script lang="ts">
  import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
  import type { Address } from '@circles-sdk/utils';
  import { normalizeSku } from '$lib/admin/productEditorUtils';
  import { popupControls } from '$lib/stores/popup';
  import type { AdminNewProductFlowContext } from './context';
  import type { AdminOdooConnection, AdminUnifiedProduct } from '$lib/admin/types';

  interface Props {
    context: AdminNewProductFlowContext;
    connections: AdminOdooConnection[];
    existingProducts: AdminUnifiedProduct[];
    onExecute: (payload: any) => Promise<void>;
    onCreateConnection: (payload: { connection: any }) => Promise<AdminOdooConnection>;
  }

  let { context, connections, onExecute }: Props = $props();

  let executing = $state(false);
  let formError = $state<string | null>(null);

  const normalizedSeller = $derived(
    context.seller ? (normalizeAddress(String(context.seller)) as Address) : undefined
  );
  const normalizedSku = $derived(normalizeSku(context.catalogItem?.product?.sku ?? '') ?? '');

  const sellerConnections = $derived.by(() => {
    if (!normalizedSeller) return [];
    const s = normalizedSeller.toLowerCase();
    return (connections ?? []).filter((c) => String(c.seller).toLowerCase() === s);
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
      if (!(context.poolId ?? '').trim()) {
        formError = 'Pool ID is required for voucher code products.';
        return null;
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
    const selectedConnection = sellerConnections.find(
      (c) => `${context.chainId}:${String(c.seller).toLowerCase()}` === key
    );
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

  async function execute(): Promise<void> {
    const payload = buildPayload();
    if (!payload) return;
    executing = true;
    try {
      await onExecute(payload);
    } finally {
      executing = false;
    }
  }
</script>

<div class="space-y-3">
  {#if formError}
    <p class="text-error text-sm">{formError}</p>
  {/if}

  <div class="bg-base-200 rounded-box p-3 text-sm">
    <div><span class="opacity-70">Seller:</span> <code class="ml-2 font-mono">{normalizedSeller ?? ''}</code></div>
    <div class="mt-1"><span class="opacity-70">SKU:</span> <code class="ml-2 font-mono">{normalizedSku}</code></div>
    <div class="mt-1"><span class="opacity-70">Type:</span> {(context.selectedType ?? 'codedispenser') === 'codedispenser' ? 'Digital voucher code' : 'Odoo'}</div>
    <div class="mt-1"><span class="opacity-70">Actions:</span>
      <ul class="list-disc ml-5">
        <li>Create/Update route (offerType={context.selectedType ?? 'codedispenser'})</li>
        <li>Create/Update {(context.selectedType ?? 'codedispenser') === 'codedispenser' ? 'Digital voucher code product' : 'Odoo product'}</li>
      </ul>
    </div>
  </div>

  <div class="flex justify-end gap-2">
    <button class="btn btn-outline btn-sm" type="button" onclick={() => popupControls.close()} disabled={executing}>
      Cancel
    </button>
    <button class="btn btn-primary btn-sm" type="button" onclick={execute} disabled={executing}>
      {executing ? 'Applying…' : 'Confirm & apply'}
    </button>
  </div>
</div>
