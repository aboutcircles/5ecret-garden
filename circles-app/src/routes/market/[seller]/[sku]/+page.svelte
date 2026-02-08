<script lang="ts">
  import {onMount} from 'svelte';
  import {page} from '$app/stores';
  import PageScaffold from '$lib/app/shell/PageScaffold.svelte';
  import ProductViewer from '$lib/components/ProductViewer.svelte';
  import {goto} from "$app/navigation";
  import type {AggregatedCatalogItem} from '$lib/areas/market/model';
  import {getFirstOffer} from '$lib/areas/market/services';
  import {normalizeEvmAddress as normalizeAddress} from '@circles-market/sdk';
  import {avatarState} from '$lib/shared/state/avatar.svelte';
  import {addToCart, cartState} from '$lib/areas/market/cart/store';
  import { getMarketClient } from '$lib/integrations/market';
  import { createLoadable } from '$lib/utils/loadable';
  import { getAddToCartState } from '$lib/areas/market/cart/addToCartUi';
  import {gnosisConfig} from "$lib/circlesConfig";

  // Derive seller and SKU from SvelteKit's $page store
    const params = $derived($page.params as { seller: string; sku: string });

    type ProductLike = AggregatedCatalogItem;

    const loader = createLoadable<ProductLike | null>(null);
    const loading = $derived($loader.loading);
    const errorMsg = $derived($loader.error || '');
    const product: ProductLike | null = $derived($loader.value);

    // Load product details
    async function loadProduct(): Promise<void> {
      await loader.run(async () => {
        const seller = normalizeAddress(params.seller);
        const sku = params.sku;
        const catalog = getMarketClient().catalog.forOperator(gnosisConfig.production.marketOperator);
        const p = await catalog.fetchProductForSellerAndSku(seller, sku);
        if (!p) {
          throw new Error('Product not found for this seller / sku.');
        }
        return p;
      });
    }

    onMount(loadProduct);

    // Handle back navigation
    function goBack(): void {
        goto(`/market/${params.seller}`);
    }

    const offer = $derived(product?.product ? getFirstOffer(product?.product) : null);
    const currentAvatar = $derived(avatarState?.avatar?.address?.toLowerCase());
    const cartLoading = $derived($cartState.loading);
    const addState = $derived(getAddToCartState({ product: product as any, offer, currentAvatar, cartLoading }));

    async function handleAddToBasket(): Promise<void> {
        if (!product) return;
        try {
            await addToCart(product, currentAvatar);
        } catch (e) {
            console.error('[cart] addToCart failed:', e);
        }
    }

    // Basket button moved to global header
</script>

<PageScaffold
        highlight="soft"
        collapsedMode="bar"
        collapsedHeightClass="h-12 md:h-14"
        maxWidthClass="page page--lg"
        contentWidthClass="page page--lg"
        usePagePadding={true}
        headerTopGapClass="mt-4 md:mt-6"
        collapsedTopGapClass="mt-3 md:mt-4"
>
    {#snippet title()}
        <div class="flex items-center gap-2">
            <button 
                type="button"
                onclick={goBack}
                class="btn btn-sm btn-ghost p-0"
                aria-label="Go back"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clip-rule="evenodd" />
                </svg>
            </button>
            <h1 class="text-xl font-semibold truncate">{product?.product?.name || 'Product Details'}</h1>
        </div>
    {/snippet}

    <!-- Basket button moved to global header -->

    {#if loading}
        <div class="flex flex-col items-center justify-center p-8">
            <svg class="animate-spin h-12 w-12 text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="text-base-content/70">Loading product details...</p>
        </div>
    {:else if errorMsg}
        <div class="flex flex-col items-center justify-center p-8">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-destructive mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-destructive text-center mb-4">{errorMsg}</p>
            <button 
                type="button"
                onclick={loadProduct}
                class="btn btn-primary mr-2"
            >
                Retry
            </button>
            <button 
                type="button"
                onclick={goBack}
                class="btn btn-outline"
            >
                Go Back
            </button>
        </div>
    {:else if product && product?.product}
        {#snippet actions()}
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
        {/snippet}

        <ProductViewer
            product={product?.product}
            offer={offer}
            seller={product.seller}
            productCid={product.productCid}
            showSeller={true}
            showMeta={true}
            meta={{ publishedAt: product.publishedAt, productCid: product.productCid, sku: product?.product?.sku }}
            layout="detail"
            actions={actions}
        />
    {:else if !loading && !errorMsg}
        <!-- Product not found -->
        <div class="flex flex-col items-center justify-center p-8">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-base-content/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-lg font-medium mb-2">Product not found</p>
            <p class="text-base-content/70 text-center mb-4">
                The product you're looking for might have been removed or doesn't exist.
            </p>
            <button 
                type="button"
                onclick={loadProduct}
                class="btn btn-primary mr-2"
            >
                Try Again
            </button>
            <button 
                type="button"
                onclick={goBack}
                class="btn btn-outline"
            >
                Browse Products
            </button>
        </div>
    {/if}
</PageScaffold>
