<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
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

  const sellerConnections = $derived.by(() => {
    if (!normalizedSeller) return [];
    const s = normalizedSeller.toLowerCase();
    return (connections ?? []).filter((c) => String(c.seller).toLowerCase() === s);
  });

  function goNext(): void {
    context.selectedType = selectedType;
    const nextTitle = selectedType === 'odoo'
      ? 'Use odoo product'
      : 'Add codes';
    if (selectedType === 'odoo' && sellerConnections.length === 0) {
      popupControls.open({
        title: 'Connect to odoo',
        component: CreateConnectionStep,
        props: { context, connections, existingProducts, onExecute, onCreateConnection },
        id: 'admin-new-product-create-connection',
      });
      return;
    }

    popupControls.open({
      title: nextTitle,
      component: DetailsStep,
      props: { context, connections, existingProducts, onExecute, onCreateConnection },
      id: 'admin-new-product-details',
    });
  }
</script>

<div class="space-y-3">
  <label class="flex items-start gap-2">
    <input class="radio radio-sm mt-1" type="radio" name="ptype" value="codedispenser" bind:group={selectedType} />
    <span>
      <div class="font-medium">Digital voucher code</div>
      <div class="text-xs opacity-70">Serve a finite pool of codes and optionally a download URL per purchase.</div>
    </span>
  </label>
  <label class="flex items-start gap-2">
    <input class="radio radio-sm mt-1" type="radio" name="ptype" value="odoo" bind:group={selectedType} />
    <span>
      <div class="font-medium">Odoo</div>
      <div class="text-xs opacity-70">Sync fulfillment with your Odoo inventory and dispatch workflows.</div>
    </span>
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
