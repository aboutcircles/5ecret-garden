<script lang="ts">
  import {onMount} from 'svelte';
  import ProductViewer from '$lib/components/ProductViewer.svelte';
  import type {AggregatedCatalogItem} from '$lib/market/types';
  import {getFirstOffer} from '$lib/market/catalogHelpers';
  import {avatarState} from '$lib/stores/avatar.svelte';
  import {addToCart, cartState} from '$lib/cart/store';
  import {normalizeEvmAddress as normalizeAddress} from '@circles-market/sdk';
  import { getMarketClient } from '$lib/sdk/marketClient';
  import { getAddToCartState } from '$lib/cart/addToCartUi';
  import { fetchAvailabilityFeed, fetchInventoryFeed, type QuantitativeValue } from '$lib/market/feeds';
  import { createLoadable } from '$lib/utils/loadable';
  import {gnosisConfig} from "$lib/circlesConfig";

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

<div class="flex flex-col gap-3 w-full max-w-[min(92vw,56rem)]">
  {#if loading}
    <div class="flex items-center gap-2 text-base-content/70 py-6">
      <span class="loading loading-spinner text-primary"></span>
      <span>Loading product…</span>
    </div>
  {:else if errorMsg}
    <div class="alert alert-warning">
      <span>{errorMsg}</span>
    </div>
  {:else if product && product?.product}
    {#snippet actions()}
      {#if addState.showButton}
        <div class="flex gap-2 w-full">
          <button
            type="button"
            class="btn btn-outline w-full"
            onclick={(e) => { e.stopPropagation(); void handleAddToBasket(); }}
            disabled={!addState.canAdd}
            title={addState.reason}
          >
            {addState.label}
          </button>
        </div>
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
    <div class="text-sm opacity-70">Product data not available</div>
  {/if}
</div>
