<script lang="ts">
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { normalizeProductImagesFromSchema } from '$lib/areas/market/services';
  import { mapAvailabilityToLabel } from '$lib/areas/market/services';
  import type { SchemaOrgOfferLite, SchemaOrgProductLite } from '$lib/areas/market/model';
  import type { Address } from '@aboutcircles/sdk-types';

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
    actions,
  }: Props = $props();

  const productImages = $derived<string[]>(normalizeProductImagesFromSchema(product));
  const imageUrl = $derived<string | null>(productImages[0] ?? null);

  const publishedDateText = $derived<string | null>(
    typeof meta?.publishedAt === 'number' ? new Date(meta.publishedAt * 1000).toLocaleDateString() : null,
  );

  // Card view should not perform live feed fetching. Use static offer fields only.
  const availabilityUi = $derived(mapAvailabilityToLabel(offer?.availability ?? null));

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
    <div class="font-semibold line-clamp-2 min-h-[3rem]">{product?.name || '(no name)'}</div>

    <!-- Price row: always reserve height; no verbose prefix; availability on the right -->
    <div class="min-h-[1.5rem] flex items-center justify-between">
      <div class="text-sm font-semibold text-primary">
        {#if offer && offer.price != null}
          {offer.price}{offer.priceCurrency ? ` ${offer.priceCurrency}` : ''}
        {:else}
          —
        {/if}
      </div>
      {#if availabilityUi}
        <span class={availabilityBadgeClass(availabilityUi.tone)}>{availabilityUi.label}</span>
      {:else}
        <span class="invisible badge">placeholder</span>
      {/if}
    </div>

    <!-- Meta row: reserve height; show seller or published date when present -->
    <div class="min-h-[1.5rem]">
      {#if showSeller && seller}
        <Avatar address={seller} view="horizontal" clickable={true} />
      {:else if showMeta && publishedDateText}
        <div class="text-xs opacity-60 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Published: {publishedDateText}
        </div>
      {/if}
    </div>

    <!-- Actions row: fixed height; right side placeholder to keep layout stable -->
    <div class="min-h-[2.25rem] flex items-center justify-between mt-2">
      <div class="inline-flex gap-2 items-center">
        {@render actions?.()}
      </div>
      <span class="invisible btn btn-sm">placeholder</span>
    </div>
  </div>
</div>
