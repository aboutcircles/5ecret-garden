<script lang="ts">
  import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
  import type { Address } from '@circles-sdk/utils';
  import { popToOrOpen } from '$lib/shared/flow';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import { NEW_CONNECTION_FLOW_SCAFFOLD_BASE } from './constants';
  import OdooConnectionForm from '$lib/areas/admin/components/OdooConnectionForm.svelte';
  import type { AdminNewConnectionFlowContext } from './context';
  import SellerStep from './1_Seller.svelte';

  interface Props {
    context: AdminNewConnectionFlowContext;
    onCreate: (payload: { connection: any }) => Promise<void>;
  }

  let { context, onCreate }: Props = $props();

  const normalizedSeller = $derived(
    context.seller ? (normalizeAddress(String(context.seller)) as Address) : undefined
  );

  let saving = $state(false);
  let formError = $state<string | null>(null);

  function editSeller(): void {
    popToOrOpen(SellerStep, {
      title: 'Select seller',
      props: { context, onCreate },
      key: 'admin-new-connection-seller',
    });
  }

  async function submit(): Promise<void> {
    if (saving) return;
    formError = null;

    if (!normalizedSeller) {
      formError = 'Seller is required.';
      return;
    }

    saving = true;
    try {
      await onCreate({
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
          enabled: Boolean(context.enabled),
        },
      });
    } catch (e: unknown) {
      formError = e instanceof Error ? e.message : 'Failed to create connection. Please try again.';
    } finally {
      saving = false;
    }
  }
</script>

<FlowStepScaffold
  {...NEW_CONNECTION_FLOW_SCAFFOLD_BASE}
  step={2}
  title="Details"
  subtitle="Enter Odoo connection details."
>
  <OdooConnectionForm
    value={context}
    onSubmit={submit}
    loading={saving}
    error={formError}
    showSellerSummary={true}
    onEditSeller={editSeller}
  />
</FlowStepScaffold>
