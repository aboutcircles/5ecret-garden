<script lang="ts">
  import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
  import type { Address } from '@circles-sdk/utils';
  import AdminProductFormBase from '$lib/areas/admin/components/AdminProductFormBase.svelte';
  import { openStep } from '$lib/shared/flow/runtime';
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import FlowStepHeader from '$lib/shared/ui/flow/FlowStepHeader.svelte';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import StepSection from '$lib/shared/ui/flow/StepSection.svelte';
  import { normalizeAddressInput } from '$lib/areas/admin/productEditorUtils';
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

  const normalizedSeller = $derived(
    context.seller ? (normalizeAddress(String(context.seller)) as Address) : undefined
  );

  let odooUrl = $state('');
  let odooDb = $state('');
  let odooUid = $state(0);
  let odooKey = $state('');
  let salePartnerId = $state<number | null>(null);
  let jsonrpcTimeoutMs = $state(30000);
  let fulfillInheritRequestAbort = $state(false);
  let enabled = $state(true);

  let saving = $state(false);
  let formError = $state<string | null>(null);

  const hasRequiredFields = $derived(
    Boolean(normalizedSeller) &&
      Boolean(odooUrl.trim()) &&
      Boolean(odooDb.trim()) &&
      Boolean(odooKey.trim())
  );

  async function submit(): Promise<void> {
    formError = null;
    if (!normalizedSeller) {
      formError = 'Seller is required.';
      return;
    }
    const normalizedSellerInput = normalizeAddressInput(String(normalizedSeller));
    if (!normalizedSellerInput) {
      formError = 'Seller address is invalid.';
      return;
    }
    if (!odooUrl.trim() || !odooDb.trim() || !odooKey.trim()) {
      formError = 'Fill all required Odoo connection fields.';
      return;
    }

    saving = true;
    try {
      const created = await onCreateConnection({
        connection: {
          chainId: context.chainId,
          seller: normalizedSellerInput,
          odooUrl: odooUrl.trim(),
          odooDb: odooDb.trim(),
          odooUid,
          odooKey: odooKey.trim(),
          salePartnerId: salePartnerId ?? undefined,
          jsonrpcTimeoutMs,
          fulfillInheritRequestAbort,
          enabled,
        },
      });

      context.selectedConnectionKey = `${context.chainId}:${String(created.seller).toLowerCase()}`;

      openStep({
        title: 'Use odoo product',
        component: DetailsStep,
        props: { context, connections: [...connections, created], existingProducts, onExecute, onCreateConnection },
        key: 'admin-new-product-details',
      });
    } finally {
      saving = false;
    }
  }
</script>

<FlowDecoration>
  <div class="w-full space-y-4">
    <FlowStepHeader
      step={4}
      total={6}
      title="Connection"
      subtitle="Create an Odoo connection for this seller."
      labels={['Seller', 'Catalog', 'Type', 'Connection', 'Details', 'Summary']}
    />

    <AdminProductFormBase
      title=""
      showHeader={false}
      onSubmit={submit}
      loading={saving}
      submitDisabled={!hasRequiredFields}
      submitLabel="Create connection"
    >
      {#if formError}
        <StepAlert variant="error" message={formError} />
      {/if}

      <StepSection title="Odoo connection">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label class="form-control">
            <span class="label-text">Odoo URL *</span>
            <input class="input input-bordered input-sm" bind:value={odooUrl} placeholder="https://your-odoo" data-popup-initial-input />
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
            <input type="number" class="input input-bordered input-sm" bind:value={salePartnerId} />
          </label>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label class="form-control">
            <span class="label-text">JSON-RPC timeout (ms)</span>
            <input type="number" class="input input-bordered input-sm" bind:value={jsonrpcTimeoutMs} min="1000" />
          </label>
          <label class="form-control">
            <span class="label-text">Fulfill inherit request abort</span>
            <input type="checkbox" class="checkbox checkbox-sm" bind:checked={fulfillInheritRequestAbort} />
          </label>
          <label class="form-control">
            <span class="label-text">Connection enabled</span>
            <input type="checkbox" class="checkbox checkbox-sm" bind:checked={enabled} />
          </label>
        </div>
      </StepSection>
    </AdminProductFormBase>
  </div>
</FlowDecoration>
