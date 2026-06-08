<script lang="ts">
  import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
  import type { Address } from '@aboutcircles/sdk-types';
  import { normalizeSku } from '$lib/areas/admin/productEditorUtils';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import { NEW_PRODUCT_FULFILLMENT_FLOW_SCAFFOLD_BASE } from './constants';
  import StepActionBar from '$lib/shared/ui/flow/StepActionBar.svelte';
  import StepSection from '$lib/shared/ui/flow/StepSection.svelte';
  import StepReviewRow from '$lib/shared/ui/flow/StepReviewRow.svelte';
  import { openStep, popToOrOpen } from '$lib/shared/flow';
  import { popupControls } from '$lib/shared/state/popup';
  import ProductPreviewCard from '$lib/areas/market/ui/product/ProductPreviewCard.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { getProduct, pickProductImageUrl } from '$lib/areas/market/services';
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
  const productCore = $derived(context.catalogItem ? getProduct(context.catalogItem) : undefined);
  const productImageUrl = $derived(productCore ? pickProductImageUrl(productCore) : null);
  const productTitle = $derived(productCore?.name ?? productCore?.sku ?? normalizedSku ?? 'Selected product');
  const productSubtitle = $derived(productCore?.sku ? `SKU: ${productCore?.sku}` : undefined);

  const sellerConnections = $derived.by(() => {
    if (!normalizedSeller) return [];
    const s = normalizedSeller.toLowerCase();
    return (connections ?? []).filter((c) => String(c.seller).toLowerCase() === s);
  });

  const summaryTypeLabel = $derived(
    (context.selectedType ?? 'codedispenser') === 'codedispenser'
      ? 'Digital voucher code'
      : (context.selectedType ?? 'codedispenser') === 'unlock'
        ? 'Unlock'
        : 'Odoo'
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
      title:
        (context.selectedType ?? 'codedispenser') === 'odoo'
          ? 'Use odoo product'
          : (context.selectedType ?? 'codedispenser') === 'unlock'
            ? 'Configure unlock'
            : 'Add codes',
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

    if (selectedType === 'unlock') {
      const lockAddress = normalizeAddress(String(context.lockAddress ?? '')) as Address | undefined;
      if (!lockAddress) {
        formError = 'Lock address is required.';
        return null;
      }
      if (!(context.rpcUrl ?? '').trim()) {
        formError = 'RPC URL is required.';
        return null;
      }
      if (!(context.servicePrivateKey ?? '').trim()) {
        formError = 'Service private key is required.';
        return null;
      }
      const totalInventory = context.totalInventory;
      if (totalInventory == null || !Number.isInteger(totalInventory) || totalInventory < 0) {
        formError = 'Total inventory must be a whole number greater than or equal to 0.';
        return null;
      }

      let durationSeconds: number | undefined;
      let expirationUnix: number | undefined;
      if ((context.unlockTimingMode ?? 'duration') === 'duration') {
        const duration = context.durationSeconds;
        if (duration == null || !Number.isInteger(duration) || duration < 0) {
          formError = 'Duration seconds must be a whole number greater than or equal to 0.';
          return null;
        }
        durationSeconds = duration;
      } else {
        const expiration = context.expirationUnix;
        if (expiration == null || !Number.isInteger(expiration) || expiration < 0) {
          formError = 'Expiration unix must be a whole number greater than or equal to 0.';
          return null;
        }
        expirationUnix = expiration;
      }

      let fixedKeyManager: Address | undefined;
      if ((context.keyManagerMode ?? 'buyer') === 'fixed') {
        fixedKeyManager = normalizeAddress(String(context.fixedKeyManager ?? '')) as Address | undefined;
        if (!fixedKeyManager) {
          formError = 'Fixed key manager is required for fixed key manager mode.';
          return null;
        }
      }

      const unlock = {
        chainId: context.chainId,
        seller: normalizedSeller,
        sku: normalizedSku,
        lockAddress,
        rpcUrl: (context.rpcUrl ?? '').trim(),
        servicePrivateKey: (context.servicePrivateKey ?? '').trim(),
        durationSeconds,
        expirationUnix,
        keyManagerMode: context.keyManagerMode ?? 'buyer',
        fixedKeyManager,
        locksmithBase: (context.locksmithBase ?? '').trim() || undefined,
        locksmithToken: (context.locksmithToken ?? '').trim() || undefined,
        totalInventory,
        enabled: Boolean(context.enabled),
      };
      return { type: 'unlock', route, unlock };
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

    let odooStock: {
      chainId: number;
      seller: Address;
      sku: string;
      availableQty: number;
    } | undefined;

    if (Boolean(context.useLocalStock)) {
      const qty = context.localAvailableQty;
      if (qty == null || !Number.isInteger(qty) || qty < 0) {
        formError = 'Local stock quantity must be a whole number greater than or equal to 0.';
        return null;
      }
      odooStock = {
        chainId: context.chainId,
        seller: normalizedSeller,
        sku: normalizedSku,
        availableQty: qty,
      };
    }

    const odoo = {
      chainId: context.chainId,
      seller: normalizedSeller,
      sku: normalizedSku,
      odooProductCode: (context.odooProductCode ?? '').trim(),
      enabled: Boolean(context.enabled),
    };
    return { type: 'odoo', route, odoo, odooStock };
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
  {...NEW_PRODUCT_FULFILLMENT_FLOW_SCAFFOLD_BASE}
  step={3}
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
    >
      {#if normalizedSeller}
        {#snippet children()}
          <Avatar address={normalizedSeller} view="small" clickable={true} />
        {/snippet}
      {/if}
    </StepReviewRow>
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
      value={
        (context.selectedType ?? 'codedispenser') === 'codedispenser'
          ? 'Code pool configuration'
          : (context.selectedType ?? 'codedispenser') === 'unlock'
            ? 'Unlock ticket mapping'
            : 'Odoo product mapping'
      }
      onChange={editDetails}
      changeLabel="Change"
    />
    {#if (context.selectedType ?? 'codedispenser') === 'odoo'}
      <StepReviewRow
        label="Local stock"
        value={context.useLocalStock ? `Enabled (${context.localAvailableQty ?? 0})` : 'Not configured'}
        onChange={editDetails}
        changeLabel="Change"
      />
    {:else if (context.selectedType ?? 'codedispenser') === 'unlock'}
      <StepReviewRow
        label="Inventory"
        value={`${context.totalInventory ?? 0}`}
        onChange={editDetails}
        changeLabel="Change"
      />
    {/if}
  </StepSection>

  <StepSection title="Selected product" subtitle="Verify the product you are configuring.">
    <ProductPreviewCard
      title={productTitle}
      subtitle={productSubtitle}
      description={productCore?.description ?? undefined}
      imageUrl={productImageUrl ?? undefined}
      size="md"
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
