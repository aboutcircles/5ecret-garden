<script lang="ts">
  import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
  import type { Address } from '@aboutcircles/sdk-types';
  import { openStep } from '$lib/shared/flow';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import { NEW_PRODUCT_FLOW_SCAFFOLD_BASE } from './constants';
  import OdooConnectionForm from '$lib/areas/admin/components/OdooConnectionForm.svelte';
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

  let saving = $state(false);
  let formError = $state<string | null>(null);

  async function submit(): Promise<void> {
    if (saving) return;
    formError = null;
    if (!normalizedSeller) {
      formError = 'Seller is required.';
      return;
    }

    saving = true;
    try {
      const created = await onCreateConnection({
        connection: {
          chainId: context.chainId,
          seller: normalizedSeller as Address,
          odooUrl: (context.odooUrl ?? '').trim(),
          odooDb: (context.odooDb ?? '').trim(),
          odooUid: context.odooUid ?? 0,
          odooKey: (context.odooKey ?? '').trim(),
          salePartnerId: context.salePartnerId ?? undefined,
          jsonrpcTimeoutMs: context.jsonrpcTimeoutMs ?? 30000,
          fulfillInheritRequestAbort: Boolean(context.fulfillInheritRequestAbort),
          enabled: Boolean(context.enabled ?? true),
        },
      });

      context.selectedConnectionKey = `${context.chainId}:${String(created.seller).toLowerCase()}`;

      openStep({
        title: 'Use odoo product',
        component: DetailsStep,
        props: { context, connections: [...connections, created], existingProducts, onExecute, onCreateConnection },
        key: 'admin-new-product-details',
      });
    } catch (e: unknown) {
      formError = e instanceof Error ? e.message : 'Failed to create connection. Please try again.';
    } finally {
      saving = false;
    }
  }
</script>

<FlowStepScaffold
  {...NEW_PRODUCT_FLOW_SCAFFOLD_BASE}
  step={4}
  title="Create Odoo connection"
  subtitle="Create an Odoo connection for this seller."
>

    <OdooConnectionForm
      value={context}
      onSubmit={submit}
      loading={saving}
      submitLabel="Create connection"
      error={formError}
    />
  </FlowStepScaffold>
