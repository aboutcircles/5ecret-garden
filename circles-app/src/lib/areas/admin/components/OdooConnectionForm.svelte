<script lang="ts">
  import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
  import { T } from '$lib/design-system/tokens.js';
  import type { Address } from '@circles-sdk/utils';
  import AdminProductFormBase from '$lib/areas/admin/components/AdminProductFormBase.svelte';
  import { normalizeAddressInput } from '$lib/areas/admin/productEditorUtils';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import StepReviewRow from '$lib/shared/ui/flow/StepReviewRow.svelte';
  import StepSection from '$lib/shared/ui/flow/StepSection.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
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
      >
        {#if normalizedSeller}
          {#snippet children()}
            <Avatar address={normalizedSeller} view="small" clickable={true} />
          {/snippet}
        {/if}
      </StepReviewRow>
    </StepSection>
  {/if}

  <StepSection title="Odoo connection">
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Odoo URL *</span>
        <input
          style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;"
          bind:value={value.odooUrl}
          placeholder="https://your-odoo"
          data-popup-initial-input
        />
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Database *</span>
        <input style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;" bind:value={value.odooDb} />
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">UID *</span>
        <input type="number" style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;" bind:value={value.odooUid} />
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">API key *</span>
        <input type="password" style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;" bind:value={value.odooKey} />
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Sale partner ID</span>
        <input type="number" style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;" bind:value={value.salePartnerId} />
      </label>
    </div>

    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:12px;">
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">JSON-RPC timeout (ms)</span>
        <input type="number" style="height:32px;padding:0 10px;border-radius:8px;border:1px solid {T.hairlineSoft};background:{T.surface};font-size:12.5px;font-family:{T.fontSans};outline:none;box-sizing:border-box;width:100%;" bind:value={value.jsonrpcTimeoutMs} min="1000" />
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Fulfill inherit request abort</span>
        <input
          type="checkbox"
          style="width:14px;height:14px;accent-color:{T.primary};"
          bind:checked={value.fulfillInheritRequestAbort}
        />
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12px;font-weight:500;color:{T.inkBody};">Connection enabled</span>
        <input type="checkbox" style="width:14px;height:14px;accent-color:{T.primary};" bind:checked={value.enabled} />
      </label>
    </div>
  </StepSection>
</AdminProductFormBase>
