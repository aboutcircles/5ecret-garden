<script lang="ts">
  import {onMount} from 'svelte';
  import ProductViewer from '$lib/areas/market/ui/product/ProductViewer.svelte';
  import type {AggregatedCatalogItem} from '$lib/areas/market/model';
  import {getFirstOffer} from '$lib/areas/market/services';
  import {avatarState} from '$lib/shared/state/avatar.svelte';
  import {addToCart, cartState} from '$lib/areas/market/cart/store';
  import {normalizeEvmAddress as normalizeAddress} from '@circles-market/sdk';
  import { getMarketClient } from '$lib/shared/data/market/marketClientProxy';
  import { getAddToCartState } from '$lib/areas/market/cart/addToCartUi';
  import { fetchAvailabilityFeed, fetchInventoryFeed, type QuantitativeValue } from '$lib/areas/market/services';
  import { createLoadable } from '$lib/areas/market/utils/loadable';
  import {gnosisConfig} from "$lib/shared/config/circles";
  import { T } from '$lib/design-system/tokens.js';

  interface Props {
    seller: string; // EVM address
    sku: string;
  }
  let { seller, sku }: Props = $props();

  type ProductLike = AggregatedCatalogItem;

  const loader = createLoadable<ProductLike | null>(null);
  const loading = $derived($loader.loading);
  const errorMsg = $derived($loader.error || '');
  const product: ProductLike | null = $derived($loader.value);

  async function loadProduct(): Promise<void> {
    await loader.run(async () => {
      const s = normalizeAddress(seller);
      const catalog = getMarketClient().catalog.forOperator(gnosisConfig.production.marketOperator);
      const p = await catalog.fetchProductForSellerAndSku(s, sku);
      if (!p) throw new Error('Product not found for this seller / sku.');
      return p;
    });
  }

  onMount(loadProduct);

  const offer = $derived(product?.product ? getFirstOffer(product?.product) : null);
  const currentAvatar = $derived(avatarState?.avatar?.address?.toLowerCase());
  const cartLoading = $derived($cartState.loading);
  let liveAvailability = $state<string | null>(null);
  let liveInventory = $state<QuantitativeValue | null>(null);

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
  const effectiveAvailabilityIri = $derived<string | null>(
    liveAvailability ?? (product as any)?.availability ?? (product?.product as any)?.availability ?? null
  );
  const effectiveInventoryValue = $derived<number | null>(
    (liveInventory?.value ?? (product as any)?.inventoryLevel?.value ?? (product?.product as any)?.inventoryLevel?.value ?? null) as number | null
  );
  const addState = $derived(
    getAddToCartState({
      product: product as any,
      offer,
      currentAvatar,
      cartLoading,
      availabilityIri: effectiveAvailabilityIri,
      inventoryValue: effectiveInventoryValue,
    })
  );

  async function handleAddToBasket(): Promise<void> {
    if (!product) return;
    try {
      await addToCart(product, currentAvatar);
    } catch (e) {
      console.error('[cart] addToCart failed:', e);
    }
  }
</script>

<div style="width:100%;max-width:min(92vw,40rem);">
  {#if loading}
    <div style="display:flex;align-items:center;gap:10px;color:{T.inkMuted};padding:24px 0;">
      <svg class="pdp-spin" style="width:20px;height:20px;color:{T.primary};" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-dasharray="28.3" stroke-dashoffset="9"/></svg>
      <span style="font-size:13px;">Loading product…</span>
    </div>
  {:else if errorMsg}
    <div style="background:{T.warningSoft};border:1px solid rgba(176,112,20,0.2);border-radius:12px;padding:12px 14px;font-size:12.5px;color:{T.inkBody};">
      {errorMsg}
    </div>
  {:else if product && product?.product}
    {#snippet actions()}
      {#if addState.showButton}
        <button
          type="button"
          style="
            width:100%;height:48px;padding:0 24px;border-radius:9999px;border:0;
            cursor:{addState.canAdd ? 'pointer' : 'not-allowed'};
            background:{addState.canAdd ? T.primary : T.pageDeep};color:{addState.canAdd ? '#fff' : T.inkMuted};
            font-family:{T.fontSans};font-size:14px;font-weight:580;
            box-shadow:{addState.canAdd ? '0 6px 16px rgba(88,73,212,0.3)' : 'none'};
          "
          onclick={(e) => { e.stopPropagation(); void handleAddToBasket(); }}
          disabled={!addState.canAdd}
          title={addState.reason}
        >{addState.label}</button>
      {/if}
    {/snippet}

    <ProductViewer
      product={product.product}
      offer={offer}
      seller={product.seller}
      productCid={product.productCid}
      showSeller={true}
      showMeta={true}
      meta={{ publishedAt: product.publishedAt, productCid: product.productCid, sku: product?.product?.sku }}
      layout="detail"
      actions={actions}
    />
  {:else}
    <div style="font-size:12.5px;color:{T.inkMuted};">Product data not available</div>
  {/if}
</div>

<style>
  @keyframes pdp-spin { from {} to { transform: rotate(360deg); } }
  .pdp-spin { animation: pdp-spin 0.8s linear infinite; }
</style>
