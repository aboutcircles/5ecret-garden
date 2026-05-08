<script lang="ts">
  import {onMount} from 'svelte';
  import {page} from '$app/stores';
  import PageScaffold from '$lib/shared/ui/shell/PageScaffold.svelte';
  import ProductViewer from '$lib/areas/market/ui/product/ProductViewer.svelte';
  import {goto} from "$app/navigation";
  import type {AggregatedCatalogItem} from '$lib/areas/market/model';
  import {getFirstOffer} from '$lib/areas/market/services';
  import {normalizeEvmAddress as normalizeAddress} from '@circles-market/sdk';
  import {avatarState} from '$lib/shared/state/avatar.svelte';
  import {addToCart, cartState} from '$lib/areas/market/cart/store';
  import { getMarketClient } from '$lib/shared/data/market/marketClientProxy';
  import { createLoadable } from '$lib/areas/market/utils/loadable';
  import { getAddToCartState } from '$lib/areas/market/cart/addToCartUi';
  import {gnosisConfig} from "$lib/shared/config/circles";
  import { T } from '$lib/design-system/tokens.js';

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
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 16px;gap:14px;">
            <span class="loading loading-spinner loading-lg" style="color:{T.primary};" aria-hidden="true"></span>
            <p style="font-size:13px;color:{T.inkMuted};margin:0;">Loading product…</p>
        </div>
    {:else if errorMsg}
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 16px;gap:12px;">
            <div style="width:56px;height:56px;border-radius:16px;background:{T.warningSoft};display:inline-flex;align-items:center;justify-content:center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={T.warning}>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <p style="font-size:13px;color:{T.inkBody};text-align:center;max-width:360px;line-height:1.5;margin:0;">{errorMsg}</p>
            <div style="display:flex;gap:8px;">
                <button
                    type="button"
                    style="height:36px;padding:0 18px;border-radius:9999px;border:0;cursor:pointer;background:{T.primary};color:#fff;font-size:13px;font-weight:580;box-shadow:0 4px 12px rgba(88,73,212,0.25);"
                    onclick={loadProduct}
                >Retry</button>
                <button
                    type="button"
                    style="height:36px;padding:0 18px;border-radius:9999px;border:1px solid {T.hairline};cursor:pointer;background:{T.surface};color:{T.ink};font-size:13px;font-weight:540;"
                    onclick={goBack}
                >Go back</button>
            </div>
        </div>
    {:else if product && product?.product}
        {#snippet actions()}
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
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 16px;gap:12px;">
            <div style="width:64px;height:64px;border-radius:18px;background:{T.surfaceAlt};display:inline-flex;align-items:center;justify-content:center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke={T.inkFaint}>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <p style="font-family:{T.fontDisplay};font-size:22px;color:{T.ink};margin:0;letter-spacing:-0.01em;">Product not found</p>
            <p style="font-size:12.5px;color:{T.inkMuted};text-align:center;max-width:320px;line-height:1.5;margin:0;">
                The product you're looking for might have been removed or doesn't exist.
            </p>
            <div style="display:flex;gap:8px;">
                <button
                    type="button"
                    style="height:36px;padding:0 18px;border-radius:9999px;border:0;cursor:pointer;background:{T.primary};color:#fff;font-size:13px;font-weight:580;box-shadow:0 4px 12px rgba(88,73,212,0.25);"
                    onclick={loadProduct}
                >Try again</button>
                <button
                    type="button"
                    style="height:36px;padding:0 18px;border-radius:9999px;border:1px solid {T.hairline};cursor:pointer;background:{T.surface};color:{T.ink};font-size:13px;font-weight:540;"
                    onclick={goBack}
                >Browse products</button>
            </div>
        </div>
    {/if}
</PageScaffold>
