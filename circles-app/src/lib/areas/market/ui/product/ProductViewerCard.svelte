<script lang="ts">
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { normalizeProductImagesFromSchema, mapAvailabilityToLabel } from '$lib/areas/market/services';
  import type { SchemaOrgOfferLite, SchemaOrgProductLite } from '$lib/areas/market/model';
  import type { Address } from '@circles-sdk/utils';
  import { T } from '$lib/design-system/tokens.js';

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

  const availabilityUi = $derived(mapAvailabilityToLabel(offer?.availability ?? null));

  const priceText = $derived(() => {
    if (!offer || offer.price == null) return null;
    return `${offer.price}${offer.priceCurrency ? ' ' + offer.priceCurrency : ''}`;
  });

  function availabilityColor(tone: 'success' | 'warning' | 'neutral'): [string, string] {
    if (tone === 'success') return [T.positiveSoft, T.positive];
    if (tone === 'warning') return [T.warningSoft, T.warning];
    return [T.pageDeep, T.inkMuted];
  }
</script>

<div style="display:flex;flex-direction:column;height:100%;">
  <!-- Image / Placeholder -->
  <div style="position:relative;height:156px;overflow:hidden;flex-shrink:0;background:{T.pageDeep};">
    {#if imageUrl}
      <img
        src={imageUrl}
        alt={product?.name ?? 'product'}
        loading="lazy"
        style="width:100%;height:100%;object-fit:cover;display:block;"
      />
    {:else}
      <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:11.5px;color:{T.inkMuted};font-weight:500;">No image</span>
      </div>
    {/if}

    {#if availabilityUi}
      {@const [bg, fg] = availabilityColor(availabilityUi.tone)}
      <span style="
        position:absolute;top:10px;left:10px;
        padding:3px 9px;border-radius:9999px;
        background:{bg};color:{fg};
        font-family:{T.fontSans};font-size:10.5px;font-weight:580;
        white-space:nowrap;
      ">{availabilityUi.label}</span>
    {/if}
  </div>

  <!-- Content -->
  <div style="padding:14px 16px 16px;display:flex;flex-direction:column;gap:6px;flex:1;">
    <div style="font-size:14px;font-weight:580;color:{T.ink};line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.6em;">
      {product?.name ?? '(no name)'}
    </div>

    {#if showSeller && seller}
      <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
        <Avatar address={seller} view="small_no_text" clickable={false} />
      </div>
    {/if}

    <div style="margin-top:auto;padding-top:12px;border-top:1px solid {T.hairlineSoft};display:flex;align-items:center;justify-content:space-between;gap:8px;">
      <div style="font-size:15px;font-weight:620;color:{T.primary};font-variant-numeric:tabular-nums;letter-spacing:-0.01em;">
        {#if offer && offer.price != null}
          {offer.price}<span style="font-size:11px;font-weight:500;color:{T.inkMuted};margin-left:3px;">{offer.priceCurrency ?? 'CRC'}</span>
        {:else}
          <span style="font-size:13px;color:{T.inkMuted};">—</span>
        {/if}
      </div>
      <div style="display:inline-flex;gap:6px;align-items:center;">
        {@render actions?.()}
      </div>
    </div>
  </div>
</div>
