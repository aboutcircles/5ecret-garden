<script lang="ts">
  import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
  import type { Address } from '@circles-sdk/utils';
  import AdminProductFormBase from '$lib/areas/admin/components/AdminProductFormBase.svelte';
  import { normalizeAddressInput } from '$lib/areas/admin/productEditorUtils';
  import { openStep } from '$lib/shared/flow/runtime';
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import FlowStepHeader from '$lib/shared/ui/flow/FlowStepHeader.svelte';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import StepSection from '$lib/shared/ui/flow/StepSection.svelte';
  import StepReviewRow from '$lib/shared/ui/flow/StepReviewRow.svelte';
  import { popupControls } from '$lib/shared/state/popup';
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

  const hasRequiredFields = $derived(
    Boolean(normalizedSeller) &&
      Boolean((context.odooUrl ?? '').trim()) &&
      Boolean((context.odooDb ?? '').trim()) &&
      Boolean((context.odooKey ?? '').trim())
  );

  let saving = $state(false);
  let formError = $state<string | null>(null);

  function editSeller(): void {
    const didPop = popupControls.popTo((entry) => entry.component === SellerStep);
    if (!didPop) {
      openStep({
        title: 'Select seller',
        component: SellerStep,
        props: { context, onCreate },
        key: 'admin-new-connection-seller',
      });
    }
  }

  async function submit(): Promise<void> {
    if (saving) return;
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
    if (!(context.odooUrl ?? '').trim() || !(context.odooDb ?? '').trim() || !(context.odooKey ?? '').trim()) {
      formError = 'Fill all required Odoo connection fields.';
      return;
    }

    saving = true;
    try {
      await onCreate({
        connection: {
          chainId: context.chainId,
          seller: normalizedSellerInput,
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

<FlowDecoration>
  <div class="w-full space-y-4" tabindex="-1" data-popup-initial-focus>
    <FlowStepHeader
      step={2}
      total={2}
      title="Details"
      subtitle="Enter Odoo connection details."
      labels={['Seller', 'Details']}
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

      <StepSection title="Seller">
        <StepReviewRow label="Seller" value={normalizedSeller ?? ''} onChange={editSeller} changeLabel="Change" />
      </StepSection>

      <StepSection title="Odoo connection">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label class="form-control">
            <span class="label-text">Odoo URL *</span>
            <input class="input input-bordered input-sm" bind:value={context.odooUrl} placeholder="https://your-odoo" data-popup-initial-input />
          </label>
          <label class="form-control">
            <span class="label-text">Database *</span>
            <input class="input input-bordered input-sm" bind:value={context.odooDb} />
          </label>
          <label class="form-control">
            <span class="label-text">UID *</span>
            <input type="number" class="input input-bordered input-sm" bind:value={context.odooUid} />
          </label>
          <label class="form-control">
            <span class="label-text">API key *</span>
            <input type="password" class="input input-bordered input-sm" bind:value={context.odooKey} />
          </label>
          <label class="form-control">
            <span class="label-text">Sale partner ID</span>
            <input type="number" class="input input-bordered input-sm" bind:value={context.salePartnerId} />
          </label>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label class="form-control">
            <span class="label-text">JSON-RPC timeout (ms)</span>
            <input type="number" class="input input-bordered input-sm" bind:value={context.jsonrpcTimeoutMs} min="1000" />
          </label>
          <label class="form-control">
            <span class="label-text">Fulfill inherit request abort</span>
            <input type="checkbox" class="checkbox checkbox-sm" bind:checked={context.fulfillInheritRequestAbort} />
          </label>
          <label class="form-control">
            <span class="label-text">Connection enabled</span>
            <input type="checkbox" class="checkbox checkbox-sm" bind:checked={context.enabled} />
          </label>
        </div>
      </StepSection>
    </AdminProductFormBase>
  </div>
</FlowDecoration>
