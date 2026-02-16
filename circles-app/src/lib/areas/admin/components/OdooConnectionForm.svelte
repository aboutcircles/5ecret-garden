<script lang="ts">
  import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
  import type { Address } from '@circles-sdk/utils';
  import AdminProductFormBase from '$lib/areas/admin/components/AdminProductFormBase.svelte';
  import { normalizeAddressInput } from '$lib/areas/admin/productEditorUtils';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import StepReviewRow from '$lib/shared/ui/flow/StepReviewRow.svelte';
  import StepSection from '$lib/shared/ui/flow/StepSection.svelte';
  import type { AdminNewConnectionFlowContext } from '$lib/areas/admin/flows/newConnection/context';
  import type { AdminNewProductFlowContext } from '$lib/areas/admin/flows/newProduct/context';

  interface Props {
    value: AdminNewConnectionFlowContext | AdminNewProductFlowContext; // must contain seller + odoo fields
    onSubmit: () => Promise<void>;
    submitLabel?: string;
    loading?: boolean;
    showSellerSummary?: boolean; // for NewConnection (shows Seller row)
    onEditSeller?: () => void; // optional for editing seller
    error?: string | null;
  }

  let {
    value,
    onSubmit,
    submitLabel = 'Create connection',
    loading = false,
    showSellerSummary = false,
    onEditSeller,
    error = null,
  }: Props = $props();

  const normalizedSeller = $derived(
    value.seller ? (normalizeAddress(String(value.seller)) as Address) : undefined
  );

  const hasRequiredFields = $derived(
    Boolean(normalizedSeller) &&
      Boolean((value.odooUrl ?? '').trim()) &&
      Boolean((value.odooDb ?? '').trim()) &&
      Boolean((value.odooKey ?? '').trim())
  );

  let validationError = $state<string | null>(null);

  async function submit(): Promise<void> {
    if (loading) return;
    validationError = null;

    if (!normalizedSeller) {
      validationError = 'Seller is required.';
      return;
    }
    const normalizedSellerInput = normalizeAddressInput(String(normalizedSeller));
    if (!normalizedSellerInput) {
      validationError = 'Seller address is invalid.';
      return;
    }
    if (!(value.odooUrl ?? '').trim() || !(value.odooDb ?? '').trim() || !(value.odooKey ?? '').trim()) {
      validationError = 'Fill all required Odoo connection fields.';
      return;
    }

    await onSubmit();
  }

  const errorToShow = $derived(validationError ?? error);
</script>

<AdminProductFormBase
  title=""
  showHeader={false}
  onSubmit={submit}
  loading={loading}
  submitDisabled={!hasRequiredFields}
  submitLabel={submitLabel}
>
  {#if errorToShow}
    <StepAlert variant="error" message={errorToShow} />
  {/if}

  {#if showSellerSummary}
    <StepSection title="Seller">
      <StepReviewRow
        label="Seller"
        value={normalizedSeller ?? ''}
        onChange={onEditSeller}
        changeLabel="Change"
      />
    </StepSection>
  {/if}

  <StepSection title="Odoo connection">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <label class="form-control">
        <span class="label-text">Odoo URL *</span>
        <input
          class="input input-bordered input-sm"
          bind:value={value.odooUrl}
          placeholder="https://your-odoo"
          data-popup-initial-input
        />
      </label>
      <label class="form-control">
        <span class="label-text">Database *</span>
        <input class="input input-bordered input-sm" bind:value={value.odooDb} />
      </label>
      <label class="form-control">
        <span class="label-text">UID *</span>
        <input type="number" class="input input-bordered input-sm" bind:value={value.odooUid} />
      </label>
      <label class="form-control">
        <span class="label-text">API key *</span>
        <input type="password" class="input input-bordered input-sm" bind:value={value.odooKey} />
      </label>
      <label class="form-control">
        <span class="label-text">Sale partner ID</span>
        <input type="number" class="input input-bordered input-sm" bind:value={value.salePartnerId} />
      </label>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <label class="form-control">
        <span class="label-text">JSON-RPC timeout (ms)</span>
        <input type="number" class="input input-bordered input-sm" bind:value={value.jsonrpcTimeoutMs} min="1000" />
      </label>
      <label class="form-control">
        <span class="label-text">Fulfill inherit request abort</span>
        <input
          type="checkbox"
          class="checkbox checkbox-sm"
          bind:checked={value.fulfillInheritRequestAbort}
        />
      </label>
      <label class="form-control">
        <span class="label-text">Connection enabled</span>
        <input type="checkbox" class="checkbox checkbox-sm" bind:checked={value.enabled} />
      </label>
    </div>
  </StepSection>
</AdminProductFormBase>
