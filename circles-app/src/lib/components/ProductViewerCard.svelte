<script lang="ts">
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { normalizeProductImagesFromSchema } from '$lib/market/imageHelpers';
  import { mapAvailabilityToLabel } from '$lib/market/feeds';
  import type { SchemaOrgOfferLite, SchemaOrgProductLite } from '$lib/market/types';
  import type { Address } from '@circles-sdk/utils';

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
  }

  let {
    product,
    offer = null,
    seller = null,
    productCid = null,
    showSeller = false,
    showMeta = false,
    meta = undefined,
  }: Props = $props();

  const productImages = $derived<string[]>(normalizeProductImagesFromSchema(product));
  const imageUrl = $derived<string | null>(productImages[0] ?? null);

  const publishedDateText = $derived<string | null>(
    typeof meta?.publishedAt === 'number' ? new Date(meta.publishedAt * 1000).toLocaleDateString() : null,
  );

  // Card view should not perform live feed fetching. Use static offer fields only.
  const availabilityUi = $derived(mapAvailabilityToLabel(offer?.availability ?? null));
  const effectiveInventoryValue = $derived<number | null>((offer?.inventoryLevel?.value ?? null) as number | null);
  const effectiveInventoryUnit = $derived<string | undefined>(offer?.inventoryLevel?.unitCode as string | undefined);

  function availabilityBadgeClass(tone: 'success' | 'warning' | 'neutral'): string {
    if (tone === 'success') return 'badge badge-success';
    if (tone === 'warning') return 'badge badge-warning';
    return 'badge badge-ghost';
  }
</script>

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
        {#if availabilityUi}
          <span class={availabilityBadgeClass(availabilityUi.tone)}>{availabilityUi.label}</span>
        {/if}
      </div>
      {#if effectiveInventoryValue != null}
        <div class="text-xs opacity-80">Stock: {effectiveInventoryValue}{effectiveInventoryUnit ? ` ${effectiveInventoryUnit}` : ''}</div>
      {/if}
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
