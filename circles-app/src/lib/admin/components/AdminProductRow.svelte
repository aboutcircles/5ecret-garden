<script lang="ts">
  import RowFrame from '$lib/ui/RowFrame.svelte';
  import AdminStatusBadge from './AdminStatusBadge.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import type { AdminUnifiedProduct, AdminProductType } from '../types';
  import { adminProductTypeLabels } from '../types';

  interface Props {
    product: AdminUnifiedProduct;
    productType: AdminProductType;
    onSelect?: (product: AdminUnifiedProduct) => void;
  }

  let { product, productType, onSelect }: Props = $props();

  const hasMapping = productType !== 'route';
  const mappingEnabled = productType === 'odoo'
    ? product.odoo?.enabled
    : productType === 'codedispenser'
      ? product.code?.enabled
      : null;
  const revokedAt = productType === 'odoo'
    ? product.odoo?.revokedAt
    : productType === 'codedispenser'
      ? product.code?.revokedAt
      : null;
  const poolRemaining = productType === 'codedispenser' ? product.code?.poolRemaining : null;
  const hasInactiveMapping = mappingEnabled === false || !!revokedAt;
  const typeLabel = productType === 'route'
    ? 'Needs adapter'
    : adminProductTypeLabels[productType];
</script>

<RowFrame
  className="bg-base-100"
  dense={true}
  noLeading={true}
  clickable={true}
  onclick={() => onSelect?.(product)}
>
  {#snippet title()}
    {product.sku}
  {/snippet}

  {#snippet subtitle()}
    <div class="min-w-0">
      <Avatar address={product.seller} view="small" clickable={true} />
    </div>
  {/snippet}

  {#snippet meta()}
    Chain {product.chainId}
  {/snippet}

  {#snippet trailing()}
    <div class="flex items-center gap-2 flex-wrap justify-end">
      <AdminStatusBadge
        label={typeLabel}
        variant={productType === 'route' ? 'warning' : 'success'}
      />
      {#if poolRemaining !== null && poolRemaining !== undefined}
        <AdminStatusBadge
          label={poolRemaining > 0 ? `${poolRemaining} left` : 'Empty'}
          variant={poolRemaining > 0 ? 'success' : 'warning'}
        />
      {/if}
      {#if !hasMapping}
        <AdminStatusBadge label="No mapping" variant="neutral" />
      {:else if hasInactiveMapping}
        <AdminStatusBadge label={revokedAt ? 'Revoked' : 'Disabled'} variant="warning" />
      {/if}
    </div>
  {/snippet}
</RowFrame>