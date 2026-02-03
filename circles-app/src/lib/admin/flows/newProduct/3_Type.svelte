<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
  import { normalizeSku } from '$lib/admin/productEditorUtils';
  import { popupControls } from '$lib/stores/popup';
  import DetailsStep from './5_Details.svelte';
  import CreateConnectionStep from './4_CreateOdooConnection.svelte';
  import type { AdminNewProductFlowContext } from './context';
  import type { AdminOdooConnection, AdminUnifiedProduct } from '$lib/admin/types';

  interface Props {
    context: AdminNewProductFlowContext;
    connections: AdminOdooConnection[];
    existingProducts: AdminUnifiedProduct[];
    onExecute: (payload: any) => Promise<void>;
    onCreateConnection: (payload: { connection: any }) => Promise<AdminOdooConnection>;
  }

  let { context, connections, existingProducts, onExecute, onCreateConnection }: Props = $props();

  let selectedType = $state<Exclude<'odoo' | 'codedispenser' | 'route', 'route'>>(
    (context.selectedType as any) ?? 'codedispenser'
  );

  const normalizedSeller = $derived(
    context.seller ? (normalizeAddress(String(context.seller)) as Address) : undefined
  );
  const normalizedSku = $derived(normalizeSku(context.catalogItem?.product?.sku ?? '') ?? '');

  const sellerConnections = $derived.by(() => {
    if (!normalizedSeller) return [];
    const s = normalizedSeller.toLowerCase();
    return (connections ?? []).filter((c) => String(c.seller).toLowerCase() === s);
  });

  function goNext(): void {
    context.selectedType = selectedType;
    if (selectedType === 'odoo' && sellerConnections.length === 0) {
      popupControls.open({
        title: 'Create Odoo connection',
        component: CreateConnectionStep,
        props: { context, connections, existingProducts, onExecute, onCreateConnection },
        id: 'admin-new-product-create-connection',
      });
      return;
    }

    popupControls.open({
      title: 'Enter details',
      component: DetailsStep,
      props: { context, connections, existingProducts, onExecute, onCreateConnection },
      id: 'admin-new-product-details',
    });
  }
</script>

<div class="space-y-3">
  <div class="text-sm">
    <span class="opacity-70">Seller:</span>
    <code class="ml-2 font-mono">{normalizedSeller ?? ''}</code>
  </div>
  <div class="text-sm">
    <span class="opacity-70">SKU:</span>
    <code class="ml-2 font-mono">{normalizedSku}</code>
  </div>

  <div class="divider text-xs">Type</div>
  <label class="flex items-center gap-2">
    <input class="radio radio-sm" type="radio" name="ptype" value="codedispenser" bind:group={selectedType} />
    <span>Voucher code (CodeDispenser)</span>
  </label>
  <label class="flex items-center gap-2">
    <input class="radio radio-sm" type="radio" name="ptype" value="odoo" bind:group={selectedType} />
    <span>Odoo</span>
  </label>

  {#if selectedType === 'odoo' && sellerConnections.length === 0}
    <div class="alert alert-info text-sm">
      This seller does not have an Odoo connection yet. Next, you can create one and then continue with the product.
    </div>
  {/if}

  <div class="flex justify-end">
    <button class="btn btn-primary btn-sm" type="button" onclick={goNext}>Next</button>
  </div>
</div>
