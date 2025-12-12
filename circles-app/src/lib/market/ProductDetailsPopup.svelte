<script lang="ts">
  import { onMount } from 'svelte';
  import ProductViewer from '$lib/components/ProductViewer.svelte';
  import type { AggregatedCatalogItem } from '$lib/market/types';
  import { getFirstOffer, resolvePayTo } from '$lib/market/catalogHelpers';
  import { fetchProductForSellerAndSku } from '$lib/market/catalogClient';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { cartState, addToCart } from '$lib/cart/store';
  import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';

  interface Props {
    seller: string; // EVM address
    sku: string;
  }
  let { seller, sku }: Props = $props();

  type ProductLike = AggregatedCatalogItem;

  let loading: boolean = $state(true);
  let errorMsg: string = $state('');
  let product: ProductLike | null = $state(null);

  async function loadProduct(): Promise<void> {
    loading = true;
    errorMsg = '';
    product = null;
    try {
      const s = normalizeAddress(seller);
      const found = await fetchProductForSellerAndSku(s, sku);
      product = found;
      if (!product) throw new Error('Product not found for this seller / sku.');
    } catch (err: unknown) {
      errorMsg = err instanceof Error ? err.message : String(err ?? 'Unknown error');
    } finally {
      loading = false;
    }
  }

  onMount(loadProduct);

  const offer = $derived(product?.product ? getFirstOffer(product?.product) : null);
  const payTo = $derived(offer ? resolvePayTo(offer) : { address: null } as any);
  const hasPayAction = $derived(!!payTo.address);
  const currentAvatar = $derived(avatarState?.avatar?.address?.toLowerCase());
  const cartLoading = $derived($cartState.loading);
  const canAdd = $derived(!!offer && hasPayAction && !!currentAvatar && !cartLoading);

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
      <div class="flex gap-2 w-full">
        <button
          type="button"
          class="btn btn-outline w-full"
          onclick={(e) => { e.stopPropagation(); void handleAddToBasket(); }}
          disabled={!canAdd}
          title={!currentAvatar
            ? 'Connect a Circles account first'
            : (!offer
                ? 'No offer available'
                : (!hasPayAction
                    ? 'This item has no PayAction; cannot add to basket'
                    : 'Add to basket'))}
        >
          Add to basket
        </button>
      </div>
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
