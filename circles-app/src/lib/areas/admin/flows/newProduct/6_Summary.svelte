<script lang="ts">
  import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
  import type { Address } from '@circles-sdk/utils';
  import { normalizeSku } from '$lib/areas/admin/productEditorUtils';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import { NEW_PRODUCT_FLOW_SCAFFOLD_BASE } from './constants';
  import StepActionBar from '$lib/shared/ui/flow/StepActionBar.svelte';
  import StepSection from '$lib/shared/ui/flow/StepSection.svelte';
  import StepReviewRow from '$lib/shared/ui/flow/StepReviewRow.svelte';
  import { openStep, popToOrOpen } from '$lib/shared/flow';
  import { popupControls } from '$lib/shared/state/popup';
  import SellerStep from './1_Seller.svelte';
  import CatalogStep from './2_Catalog.svelte';
  import TypeStep from './3_Type.svelte';
  import DetailsStep from './5_Details.svelte';
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

  const summaryTypeLabel = $derived(
    (context.selectedType ?? 'codedispenser') === 'codedispenser' ? 'Digital voucher code' : 'Odoo'
  );

  function editSeller(): void {
    popToOrOpen(SellerStep, {
      title: 'Select seller',
      props: { context, connections, existingProducts, onExecute, onCreateConnection },
      key: 'admin-new-product-seller',
    });
  }

  function editCatalog(): void {
    popToOrOpen(CatalogStep, {
      title: 'Select catalog product',
      props: { context, connections, existingProducts, onExecute, onCreateConnection },
      key: 'admin-new-product-catalog',
    });
  }

  function editType(): void {
    popToOrOpen(TypeStep, {
      title: 'Choose fulfillment type',
      props: { context, connections, existingProducts, onExecute, onCreateConnection },
      key: 'admin-new-product-type',
    });
  }

  function editDetails(): void {
    popToOrOpen(DetailsStep, {
      title: (context.selectedType ?? 'codedispenser') === 'odoo' ? 'Use odoo product' : 'Add codes',
      props: { context, connections, existingProducts, onExecute, onCreateConnection },
      key: 'admin-new-product-details',
    });
  }

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

<FlowStepScaffold
  {...NEW_PRODUCT_FLOW_SCAFFOLD_BASE}
  step={6}
  title="Summary"
  subtitle="Review and apply product configuration."
>
  {#if formError}
    <StepAlert variant="error" message={formError} />
  {/if}

  <StepSection title="Review configuration" subtitle="Use Change to jump back to a specific setup step.">
    <StepReviewRow
      label="Seller"
      value={normalizedSeller ?? ''}
      onChange={editSeller}
      changeLabel="Change"
    />
    <StepReviewRow
      label="Catalog SKU"
      value={normalizedSku}
      onChange={editCatalog}
      changeLabel="Change"
    />
    <StepReviewRow
      label="Fulfillment type"
      value={summaryTypeLabel}
      onChange={editType}
      changeLabel="Change"
    />
    <StepReviewRow
      label="Details"
      value={(context.selectedType ?? 'codedispenser') === 'codedispenser' ? 'Code pool configuration' : 'Odoo product mapping'}
      onChange={editDetails}
      changeLabel="Change"
    />
  </StepSection>

  <StepActionBar>
    {#snippet secondary()}
      <button class="btn btn-outline btn-sm" type="button" onclick={() => popupControls.close()} disabled={executing}>
        Cancel
      </button>
    {/snippet}
    {#snippet primary()}
      <button class="btn btn-primary btn-sm" type="button" onclick={execute} disabled={executing}>
        {executing ? 'Applying…' : 'Confirm & apply'}
      </button>
    {/snippet}
  </StepActionBar>
</FlowStepScaffold>
