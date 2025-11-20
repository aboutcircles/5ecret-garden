<script lang="ts">
  import ProductGallery from '$lib/components/ProductGallery.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { normalizeProductImagesFromSchema } from '$lib/market/imageHelpers';
  import type { SchemaOrgOfferLite, SchemaOrgProductLite } from '$lib/market/types';
  import type { Address } from '@circles-sdk/utils';

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
  }: Props = $props();

  // Runes mode: use $derived for reactive derivations
  const productImages = $derived<string[]>(normalizeProductImagesFromSchema(product));

  const imageUrl = $derived<string | null>(productImages[0] ?? null);

  const publishedDateText = $derived<string | null>(
    typeof meta?.publishedAt === 'number' ? new Date(meta.publishedAt * 1000).toLocaleDateString() : null,
  );
</script>

{#if layout === 'detail'}
  <!-- Detail view -->
  <!-- Product Images -->
  {#if productImages.length > 0}
    <ProductGallery images={productImages} />
  {:else}
    <div class="bg-base-200 rounded-lg p-8 flex items-center justify-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-base-content/30 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  {/if}

  <!-- Product Details -->
  <div class="space-y-4">
    <!-- Seller Info -->
    {#if showSeller && seller}
      <div class="flex items-center gap-3 p-3 bg-base-100 rounded-lg">
        <Avatar address={seller} view="horizontal" clickable={true} />
        <a href={`/market/${encodeURIComponent(seller)}`} class="btn btn-sm btn-ghost">View Profile</a>
      </div>
    {/if}

    <!-- Product Name -->
    <h2 class="text-2xl font-bold">{product.name || '(no name)'}</h2>

    <!-- Description -->
    {#if product?.description}
      <div class="prose prose-sm max-w-none">
        {@html product.description}
      </div>
    {/if}

    <!-- Offer Information -->
    {#if offer}
      <div class="bg-base-100 rounded-lg p-4 space-y-2">
        <h3 class="font-semibold">Offer Details</h3>
        <div class="flex items-center justify-between">
          <span class="text-sm text-base-content/70">Price:</span>
          <span class="font-medium">{offer?.price ?? '?'}</span>
        </div>
        {#if offer?.priceCurrency}
          <div class="flex items-center justify-between">
            <span class="text-sm text-base-content/70">Currency:</span>
            <span>{offer.priceCurrency}</span>
          </div>
        {/if}

        {#if typeof offer?.checkout === 'string' && offer.checkout.trim() !== ''}
          <a
            href={offer.checkout}
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-primary w-full mt-4"
          >
            Purchase Now
          </a>
        {/if}
      </div>
    {/if}

    <!-- External Links -->
    <div class="flex flex-wrap gap-3 items-center">
      {#if product.url}
        <a class="link link-primary" href={product.url} target="_blank" rel="noopener">Product URL</a>
      {/if}
      {#if productCid}
        <a class="link link-primary" href={`https://ipfs.io/ipfs/${productCid}`} target="_blank" rel="noopener">IPFS</a>
      {/if}
    </div>

    {#if showMeta && meta}
      <div class="text-xs opacity-60 flex items-center gap-3">
        {#if publishedDateText}
          <div>Published: {publishedDateText}</div>
        {/if}
        {#if meta.sku}
          <div>SKU: {meta.sku}</div>
        {/if}
        {#if meta.productCid}
          <div>CID: {meta.productCid}</div>
        {/if}
      </div>
    {/if}

    <slot name="actions" />
  </div>
{:else}
  <!-- Card view -->
  <div class="flex flex-col">
    {#if imageUrl}
      <img class="w-full h-44 object-cover" alt={product?.name || 'product-image'} loading="lazy" src={imageUrl || ''} />
    {:else}
      <div class="w-full h-44 bg-base-200 text-base-content/50 flex items-center justify-center text-xs">No image</div>
    {/if}

    <div class="p-3 flex flex-col gap-1">
      <div class="font-semibold truncate">{product?.name || '(no name)'}</div>

      {#if product?.description}
        <div class="text-xs opacity-70 line-clamp-3">{product.description}</div>
      {/if}

      {#if offer}
        <div class="text-sm font-medium text-primary">
          Offer: {offer?.price ?? '?'}{offer?.priceCurrency ? ` ${offer.priceCurrency}` : ''}
          {#if offer?.availability}
            ({offer.availability})
          {/if}
        </div>
      {/if}

      {#if showSeller && seller}
        <Avatar address={seller} view="horizontal" clickable={false} />
      {:else if showMeta && publishedDateText}
        <div class="text-xs opacity-60 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Published: {publishedDateText}
        </div>
      {/if}

      <div class="flex items-center justify-between mt-2">
        <div class="inline-flex gap-2 items-center">
          <slot name="actions" />
        </div>
        <div class="inline-flex items-center gap-2">
          {#if product?.url}
            <a class="link link-primary text-xs" href={product.url} target="_blank" rel="noopener">Product</a>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
