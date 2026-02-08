<script lang="ts">
  import type { SchemaOrgOfferLite, SchemaOrgProductLite } from '$lib/domains/market/model';
  import type { Address } from '@circles-sdk/utils';
  import ProductViewerDetail from './ProductViewerDetail.svelte';
  import ProductViewerCard from './ProductViewerCard.svelte';

  type Layout = 'detail' | 'card';

  interface Meta {
    publishedAt?: number;
    sku?: string;
    productCid?: string | null;
  }

  interface Props {
    product: SchemaOrgProductLite;
    offer?: SchemaOrgOfferLite | null;
    seller?: Address | null;
    productCid?: string | null;

    showSeller?: boolean;
    showMeta?: boolean;
    meta?: Meta;
    layout?: Layout;
    actions?: any;
  }

  let {
    product,
    offer = null,
    seller = null,
    productCid = null,
    showSeller = false,
    showMeta = false,
    meta = undefined,
    layout = 'detail',
    actions,
  }: Props = $props();
</script>

{#if layout === 'detail'}
  <ProductViewerDetail
    {product}
    {offer}
    {seller}
    {productCid}
    {showSeller}
    {showMeta}
    {meta}
    actions={actions}
  />
{:else}
  <ProductViewerCard
    {product}
    {offer}
    {seller}
    {productCid}
    {showSeller}
    {showMeta}
    {meta}
    actions={actions}
  />
{/if}
