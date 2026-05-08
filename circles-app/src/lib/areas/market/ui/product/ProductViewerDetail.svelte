<script lang="ts">
  import ProductGallery from '$lib/areas/market/ui/product/ProductGallery.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import Markdown from '$lib/shared/ui/content/markdown/Markdown.svelte';
  import { normalizeProductImagesFromSchema } from '$lib/areas/market/services';
  import { fetchAvailabilityFeed, fetchInventoryFeed, mapAvailabilityToLabel } from '$lib/areas/market/services';
  import type { QuantitativeValue } from '$lib/areas/market/services';
  import type { SchemaOrgOfferLite, SchemaOrgProductLite } from '$lib/areas/market/model';
  import type { Address } from '@circles-sdk/utils';

  import { ipfsGatewayUrl } from '$lib/shared/utils/ipfs';
  import { sanitizeUrl } from '$lib/shared/ui/content/markdown/ast';
  import JumpLink from '$lib/shared/ui/content/jump/JumpLink.svelte';
  import { T } from '$lib/design-system/tokens.js';
  import Icon from '$lib/design-system/Icon.svelte';

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

  function availabilityPalette(tone: 'success' | 'warning' | 'neutral'): [string, string] {
    if (tone === 'success') return [T.positiveSoft, T.positive];
    if (tone === 'warning') return [T.warningSoft, T.warning];
    return [T.pageDeep, T.inkMuted];
  }

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

<div style="display:flex;flex-direction:column;gap:16px;">
  <!-- Product Images -->
  {#if productImages.length > 0}
    <div style="border-radius:18px;overflow:hidden;background:{T.pageDeep};">
      <ProductGallery images={productImages} />
    </div>
  {:else}
    <div style="
      border-radius:18px;background:{T.pageDeep};
      height:200px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" fill="none" viewBox="0 0 24 24" stroke={T.inkSubtle}>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <span style="font-size:11.5px;color:{T.inkMuted};font-weight:500;">No image</span>
    </div>
  {/if}

  <!-- Title + price + availability -->
  <div style="display:flex;flex-direction:column;gap:8px;">
    <h2 style="font-family:{T.fontDisplay};font-size:28px;font-weight:400;letter-spacing:-0.02em;line-height:1.15;color:{T.ink};margin:0;">
      {product.name || '(no name)'}
    </h2>

    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      {#if offer && offer.price != null}
        <span style="font-family:{T.fontSans};font-size:20px;font-weight:620;color:{T.primary};letter-spacing:-0.01em;font-variant-numeric:tabular-nums;">
          {offer.price}<span style="font-size:13px;font-weight:500;color:{T.inkMuted};margin-left:4px;">{offer.priceCurrency ?? 'CRC'}</span>
        </span>
      {/if}

      {#if availabilityUi}
        {@const [bg, fg] = availabilityPalette(availabilityUi.tone)}
        <span style="
          display:inline-flex;align-items:center;
          padding:4px 11px;border-radius:9999px;
          background:{bg};color:{fg};
          font-family:{T.fontSans};font-size:11px;font-weight:580;
        ">{availabilityUi.label}</span>
      {/if}
    </div>
  </div>

  <!-- Seller card -->
  {#if showSeller && seller}
    <div style="
      display:flex;align-items:center;gap:12px;
      padding:12px 14px;border-radius:14px;
      background:{T.surface};border:1px solid {T.hairlineSoft};box-shadow:{T.shadow.xs};
    ">
      <div style="flex:1;min-width:0;">
        <div style="font-size:10.5px;font-weight:580;color:{T.inkMuted};letter-spacing:0.04em;text-transform:uppercase;margin-bottom:6px;">Seller</div>
        <Avatar address={seller} view="horizontal" clickable={true} />
      </div>
      <a
        href={`/market/${encodeURIComponent(seller)}`}
        style="
          flex-shrink:0;height:32px;padding:0 14px;border-radius:9999px;
          background:{T.pageDeep};color:{T.inkBody};
          display:inline-flex;align-items:center;justify-content:center;
          font-family:{T.fontSans};font-size:12px;font-weight:540;text-decoration:none;
        "
      >View profile</a>
    </div>
  {/if}

  <!-- Description -->
  {#if product?.description}
    <div style="font-size:13.5px;color:{T.inkBody};line-height:1.55;">
      <Markdown content={product.description} class="prose prose-sm max-w-none" />
    </div>
  {/if}

  <!-- Offer details -->
  {#if offer}
    <div style="
      background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;
      box-shadow:{T.shadow.xs};overflow:hidden;
    ">
      <div style="padding:12px 14px 4px;">
        <span style="font-size:10.5px;font-weight:580;color:{T.inkMuted};letter-spacing:0.04em;text-transform:uppercase;">Offer details</span>
      </div>

      {#if effectiveInventoryValue != null}
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-top:1px solid {T.hairlineSoft};">
          <span style="font-size:12.5px;color:{T.inkMuted};">Stock</span>
          <span style="font-size:13px;font-weight:540;color:{T.ink};font-variant-numeric:tabular-nums;">{effectiveInventoryValue}{effectiveInventoryUnit ? ` ${effectiveInventoryUnit}` : ''}</span>
        </div>
      {/if}

      {#if offer?.availableDeliveryMethod}
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-top:1px solid {T.hairlineSoft};">
          <span style="font-size:12.5px;color:{T.inkMuted};">Delivery</span>
          <span style="font-size:13px;font-weight:540;color:{T.ink};max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title={offer.availableDeliveryMethod}>
            {deliveryMethodLabel(offer.availableDeliveryMethod)}
          </span>
        </div>
      {/if}

      {#if offer?.priceCurrency}
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-top:1px solid {T.hairlineSoft};">
          <span style="font-size:12.5px;color:{T.inkMuted};">Currency</span>
          <span style="font-size:13px;font-weight:540;color:{T.ink};font-family:{T.fontMono};">{offer.priceCurrency}</span>
        </div>
      {/if}
    </div>
  {/if}

  <!-- External links -->
  {#if productUrlSafe || ipfsUrlSafe}
    <div style="display:flex;flex-wrap:wrap;gap:6px;">
      {#if productUrlSafe}
        <JumpLink className="" url={productUrlSafe}>
          <span style="
            display:inline-flex;align-items:center;gap:6px;
            height:30px;padding:0 12px;border-radius:9999px;
            background:{T.surface};border:1px solid {T.hairline};color:{T.inkBody};
            font-family:{T.fontSans};font-size:12px;font-weight:540;
            box-shadow:{T.shadow.xs};
          ">
            <Icon name="external" size={11} stroke={T.inkBody} />
            Product URL
          </span>
        </JumpLink>
      {/if}
      {#if ipfsUrlSafe}
        <JumpLink className="" url={ipfsUrlSafe}>
          <span style="
            display:inline-flex;align-items:center;gap:6px;
            height:30px;padding:0 12px;border-radius:9999px;
            background:{T.surface};border:1px solid {T.hairline};color:{T.inkBody};
            font-family:{T.fontSans};font-size:12px;font-weight:540;
            box-shadow:{T.shadow.xs};
          ">
            <Icon name="link" size={11} stroke={T.inkBody} />
            IPFS
          </span>
        </JumpLink>
      {/if}
    </div>
  {/if}

  <!-- Meta -->
  {#if showMeta && meta}
    <div style="display:flex;flex-wrap:wrap;gap:14px;padding:0 2px;font-size:11px;color:{T.inkSubtle};font-family:{T.fontMono};">
      {#if publishedDateText}
        <div>Published: {publishedDateText}</div>
      {/if}
      {#if meta.sku}
        <div>SKU: {meta.sku}</div>
      {/if}
      {#if meta.productCid}
        <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:280px;">CID: {meta.productCid}</div>
      {/if}
    </div>
  {/if}

  <!-- Actions (Add to cart) -->
  <div style="margin-top:4px;">
    {@render actions?.()}
  </div>
</div>
