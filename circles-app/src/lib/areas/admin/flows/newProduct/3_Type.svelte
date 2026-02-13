<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
  import { openStep } from '$lib/shared/flow/runtime';
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import FlowStepHeader from '$lib/shared/ui/flow/FlowStepHeader.svelte';
  import StepActionBar from '$lib/shared/ui/flow/StepActionBar.svelte';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import DetailsStep from './5_Details.svelte';
  import CreateConnectionStep from './4_CreateOdooConnection.svelte';
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
      openStep({
        title: 'Connect to odoo',
        component: CreateConnectionStep,
        props: { context, connections, existingProducts, onExecute, onCreateConnection },
        key: 'admin-new-product-create-connection',
      });
      return;
    }

    openStep({
      title: nextTitle,
      component: DetailsStep,
      props: { context, connections, existingProducts, onExecute, onCreateConnection },
      key: 'admin-new-product-details',
    });
  }
</script>

<FlowDecoration>
  <div class="w-full space-y-4" tabindex="-1" data-popup-initial-focus>
    <FlowStepHeader
      step={3}
      total={6}
      title="Type"
      subtitle="Choose how this product will be fulfilled."
      labels={['Seller', 'Catalog', 'Type', 'Connection', 'Details', 'Summary']}
    />

    <div class="space-y-3">
      <label class="flex items-start gap-2">
        <input class="radio radio-sm mt-1" type="radio" name="ptype" value="codedispenser" bind:group={selectedType} data-popup-initial-input />
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
        <StepAlert
          variant="info"
          message="This seller does not have an Odoo connection yet. Next, you can create one and then continue with the product."
        />
      {/if}

      <StepActionBar>
        {#snippet primary()}
          <button class="btn btn-primary btn-sm" type="button" onclick={goNext}>Continue</button>
        {/snippet}
      </StepActionBar>
    </div>
  </div>
</FlowDecoration>
