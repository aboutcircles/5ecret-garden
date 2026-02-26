<script lang="ts">
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import AdminStatusBadge from './AdminStatusBadge.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import type { AdminUnifiedProduct, AdminProductType } from '../types';
  import { getMarketClient } from '$lib/shared/data/market/marketClientProxy';
  import { gnosisConfig } from '$lib/shared/config/circles';
  import { getProduct, pickProductImageUrl } from '$lib/areas/market/services';
  import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
  import { onMount } from 'svelte';

  interface Props {
    product: AdminUnifiedProduct;
    productType: AdminProductType;
    onSelect?: (product: AdminUnifiedProduct) => void;
    hideSeller?: boolean;
  }

  let { product, productType, onSelect, hideSeller = false }: Props = $props();

  const hasMapping = $derived(productType !== 'route');
  const routeEnabled = $derived(product.route?.enabled);
  const mappingEnabled = $derived(
    productType === 'odoo'
      ? product.odoo?.enabled
      : productType === 'codedispenser'
        ? product.code?.enabled
        : null
  );
  const revokedAt = $derived(
    productType === 'odoo'
      ? product.odoo?.revokedAt
      : productType === 'codedispenser'
        ? product.code?.revokedAt
        : null
  );
  const poolRemaining = $derived(
    productType === 'codedispenser' ? product.code?.poolRemaining : null
  );
  const odooLocalAvailableQty = $derived(
    productType === 'odoo' ? product.odoo?.localAvailableQty : null
  );
  const odooTotalInventory = $derived(
    productType === 'odoo' ? product.odoo?.totalInventory : null
  );
  const hasInactiveMapping = $derived(
    mappingEnabled === false || !!revokedAt || routeEnabled === false
  );
  const needsAdapterLabel = $derived(productType === 'route' ? 'Needs adapter' : null);
  const typeVariant = $derived(
    hasInactiveMapping ? 'error' : productType === 'route' ? 'warning' : 'success'
  );

  let imageUrl = $state<string | null>(null);
  let mounted = $state(false);

  async function resolveProductImage(): Promise<void> {
    try {
      const seller = normalizeAddress(String(product.seller));
      const sku = String(product.sku);
      if (!seller || !sku) {
        imageUrl = null;
        return;
      }
      const catalog = getMarketClient().catalog.forOperator(gnosisConfig.production.marketOperator);
      const item = await catalog.fetchProductForSellerAndSku(String(seller), sku);
      if (!item) {
        imageUrl = null;
        return;
      }
      const prod = getProduct(item);
      imageUrl = pickProductImageUrl(prod);
    } catch {
      imageUrl = null;
    }
  }

  onMount(() => {
    mounted = true;
  });

  $effect(() => {
    if (!mounted) return;
    resolveProductImage();
  });
</script>

<RowFrame
  className="bg-base-100"
  dense={true}
  clickable={true}
  onclick={() => onSelect?.(product)}
>
  {#snippet leading()}
    <div class="w-10 h-10 rounded-md bg-base-200 overflow-hidden shrink-0 flex items-center justify-center">
      {#if imageUrl}
        <img src={imageUrl} alt="" class="w-10 h-10 object-cover" />
      {:else}
        <span class="text-[10px] opacity-60">No image</span>
      {/if}
    </div>
  {/snippet}

  {#snippet title()}
    {product.sku}
  {/snippet}

  {#snippet subtitle()}
    {#if !hideSeller}
      <div class="min-w-0">
        <Avatar address={product.seller} view="small" clickable={true} />
      </div>
    {/if}
  {/snippet}

  {#snippet meta()}
    Chain {product.chainId}
  {/snippet}

  {#snippet trailing()}
    <div class="flex items-center gap-2 flex-wrap justify-end">
      {#if needsAdapterLabel}
        <AdminStatusBadge
          label={needsAdapterLabel}
          variant={typeVariant}
        />
      {/if}
      {#if poolRemaining !== null && poolRemaining !== undefined}
        <AdminStatusBadge
          label={poolRemaining > 0 ? `${poolRemaining} left` : 'Empty'}
          variant={poolRemaining > 0 ? 'success' : 'warning'}
        />
      {/if}
      {#if productType === 'odoo'}
        <AdminStatusBadge
          label={
            odooLocalAvailableQty == null
              ? 'Local stock: fallback'
              : `Local stock: ${odooLocalAvailableQty}`
          }
          variant={odooLocalAvailableQty == null ? 'neutral' : odooLocalAvailableQty > 0 ? 'success' : 'warning'}
        />
        {#if odooTotalInventory != null}
          <AdminStatusBadge
            label={`Total: ${odooTotalInventory}`}
            variant="neutral"
          />
        {/if}
      {/if}
      {#if !hasMapping}
        <AdminStatusBadge label="No mapping" variant="neutral" />
      {:else if hasInactiveMapping}
        <AdminStatusBadge label={revokedAt ? 'Revoked' : 'Disabled'} variant="warning" />
      {/if}
    </div>
  {/snippet}
</RowFrame>