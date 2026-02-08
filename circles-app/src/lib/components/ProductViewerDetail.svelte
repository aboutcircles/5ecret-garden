<script lang="ts">
  import ProductGallery from '$lib/components/ProductGallery.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import Markdown from '$lib/components/markdown/Markdown.svelte';
  import { normalizeProductImagesFromSchema } from '$lib/domains/market/services/imageHelpers';
  import { fetchAvailabilityFeed, fetchInventoryFeed, mapAvailabilityToLabel } from '$lib/domains/market/services/feeds';
  import type { QuantitativeValue } from '$lib/domains/market/services/feeds';
  import type { SchemaOrgOfferLite, SchemaOrgProductLite } from '$lib/domains/market/model/types';
  import type { Address } from '@circles-sdk/utils';

  import { ipfsGatewayUrl } from '$lib/utils/ipfs';
  import { sanitizeUrl } from '$lib/components/markdown/ast';
  import JumpLink from '$lib/components/jump/JumpLink.svelte';

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

  const productUrlSafe = $derived(
    typeof product?.url === 'string' ? sanitizeUrl(product.url) : null
  );

  const ipfsUrlSafe = $derived(
    productCid ? sanitizeUrl(ipfsGatewayUrl(productCid)) : null
  );

  const publishedDateText = $derived<string | null>(
    typeof meta?.publishedAt === 'number' ? new Date(meta.publishedAt * 1000).toLocaleDateString() : null,
  );

  // Live feed (display-only) state — enabled in detail view
  let liveAvailability: string | null = $state(null);
  let liveInventory: QuantitativeValue | null = $state(null);

  $effect(async () => {
    liveAvailability = null;
    liveInventory = null;
    const af = offer?.availabilityFeed;
    const inf = offer?.inventoryFeed;
    try {
      if (typeof af === 'string' && af) {
        liveAvailability = await fetchAvailabilityFeed(af);
      }
    } catch (e) {
      console.warn('[feeds] availability fetch failed', { uri: af, error: e });
    }
    try {
      if (typeof inf === 'string' && inf) {
        liveInventory = await fetchInventoryFeed(inf);
      }
    } catch (e) {
      console.warn('[feeds] inventory fetch failed', { uri: inf, error: e });
    }
  });

  const effectiveAvailabilityIri = $derived<string | null>(liveAvailability ?? offer?.availability ?? null);
  const availabilityUi = $derived(mapAvailabilityToLabel(effectiveAvailabilityIri));
  const effectiveInventoryValue = $derived<number | null>((liveInventory?.value ?? offer?.inventoryLevel?.value ?? null) as number | null);
  const effectiveInventoryUnit = $derived<string | undefined>((liveInventory?.unitCode ?? offer?.inventoryLevel?.unitCode) as string | undefined);

  function availabilityBadgeClass(tone: 'success' | 'warning' | 'neutral'): string {
    if (tone === 'success') return 'badge badge-success';
    if (tone === 'warning') return 'badge badge-warning';
    return 'badge badge-ghost';
  }

  // Map common GoodRelations delivery method IRIs to concise labels
  function deliveryMethodLabel(iri?: string | null): string {
    if (!iri) return '';
    const map: Record<string, string> = {
      'http://purl.org/goodrelations/v1#DeliveryModePickUp': 'Pick up',
      'http://purl.org/goodrelations/v1#DeliveryModeOwnFleet': 'Own fleet',
      'http://purl.org/goodrelations/v1#DeliveryModeMail': 'Mail',
      'http://purl.org/goodrelations/v1#DeliveryModeFreight': 'Freight',
      'http://purl.org/goodrelations/v1#DeliveryModeDHL': 'DHL',
      'http://purl.org/goodrelations/v1#DeliveryModeUPS': 'UPS',
      'http://purl.org/goodrelations/v1#DeliveryModeFedEx': 'FedEx',
    };
    return map[iri] || iri;
  }
</script>

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
    <Markdown content={product.description} class="prose prose-sm max-w-none" />
  {/if}

  <!-- Offer Information -->
  {#if offer}
    <div class="bg-base-100 rounded-lg p-4 space-y-2">
      <h3 class="font-semibold">Offer Details</h3>
      {#if availabilityUi}
        <div class="flex items-center justify-between">
          <span class="text-sm text-base-content/70">Availability:</span>
          <span class={availabilityBadgeClass(availabilityUi.tone)}>{availabilityUi.label}</span>
        </div>
      {/if}
      {#if effectiveInventoryValue != null}
        <div class="flex items-center justify-between">
          <span class="text-sm text-base-content/70">Stock:</span>
          <span class="font-medium">{effectiveInventoryValue}{effectiveInventoryUnit ? ` ${effectiveInventoryUnit}` : ''}</span>
        </div>
      {/if}
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
      {#if offer?.availableDeliveryMethod}
        <div class="flex items-center justify-between">
          <span class="text-sm text-base-content/70">Delivery:</span>
          <span class="truncate max-w-[70%]" title={offer.availableDeliveryMethod}>
            {deliveryMethodLabel(offer.availableDeliveryMethod)}
          </span>
        </div>
      {/if}

    </div>
  {/if}

  <!-- External Links -->
  <div class="flex flex-wrap gap-3 items-center">
    {#if productUrlSafe}
      <JumpLink className="link link-primary" url={productUrlSafe}>Product URL</JumpLink>
    {/if}

    {#if ipfsUrlSafe}
      <JumpLink className="link link-primary" url={ipfsUrlSafe}>IPFS</JumpLink>
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

  {@render actions?.()}
</div>
