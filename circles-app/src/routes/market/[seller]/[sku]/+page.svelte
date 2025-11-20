<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
    import ProductViewer from '$lib/components/ProductViewer.svelte';
    import {goto} from "$app/navigation";
    import { MARKET_API_BASE, MARKET_OPERATOR } from '$lib/config/market';
    import type { AggregatedCatalogItem } from '$lib/market/types';
    import { extractProducts, getFirstOffer } from '$lib/market/catalogHelpers';
    import { normalizeAddress } from '$lib/offers/adapters';

    // Derive seller and SKU from SvelteKit's $page store
    const params = $derived($page.params as { seller: string; sku: string });

    // Defaults (as requested)
    const OPERATOR: `0x${string}` = MARKET_OPERATOR;
    
    // Static API base
    const API_BASE = MARKET_API_BASE;

    type ProductLike = AggregatedCatalogItem;

    let loading: boolean = $state(true);
    let errorMsg: string = $state('');
    let product: ProductLike | null = $state(null);

    // Load product details
    async function loadProduct(): Promise<void> {
        loading = true;
        errorMsg = '';
        product = null;

        try {
            const seller = normalizeAddress(params.seller);
            const url = `${API_BASE}/api/operator/${OPERATOR}/catalog?avatars=${seller}`;
            const res = await fetch(url, {headers: {Accept: 'application/ld+json'}});
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`);
            }
            const body = await res.json();
            const items = extractProducts(body);
            const fromSeller = items.filter(i => (i.seller?.toLowerCase?.() ?? i.seller) === seller);
            product = fromSeller.find(i => i.product?.sku === params.sku) ?? null;
            if (!product && fromSeller.length > 0) {
                product = fromSeller.find(i => (i as any).id === params.sku || (i as any).productCid === params.sku) ?? fromSeller[0];
            }
            console.log("seller-sku-page: ", product);

        } catch (err: any) {
            errorMsg = err?.message ?? String(err);
        } finally {
            loading = false;
        }
    }

    onMount(loadProduct);

    // Handle back navigation
    function goBack(): void {
        // Determine if we should go to seller profile or marketplace
        const url = new URL(window.location.href);
        const pathParts = url.pathname.split('/').filter(Boolean);
        
        if (pathParts.length >= 3 && pathParts[1] === 'market' && pathParts[2]) {
            // Go back to seller profile: /market/[seller]
            goto(`/market/${params.seller}`);
        } else {
            // Go back to main marketplace
            goto('/market');
        }
    }

    const offer = $derived(product?.product ? getFirstOffer(product?.product) : null);
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
    <svelte:fragment slot="title">
        <div class="flex items-center gap-2">
            <button 
                type="button"
                on:click={goBack}
                class="btn btn-sm btn-ghost p-0"
                aria-label="Go back"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clip-rule="evenodd" />
                </svg>
            </button>
            <h1 class="text-xl font-semibold truncate">{product?.product?.name || 'Product Details'}</h1>
        </div>
    </svelte:fragment>

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
                on:click={loadProduct}
                class="btn btn-primary mr-2"
            >
                Retry
            </button>
            <button 
                type="button"
                on:click={goBack}
                class="btn btn-outline"
            >
                Go Back
            </button>
        </div>
    {:else if product && product?.product}
        <ProductViewer
            product={product?.product}
            offer={offer}
            seller={product.seller}
            productCid={product.productCid}
            showSeller={true}
            showMeta={true}
            meta={{ publishedAt: product.publishedAt, productCid: product.productCid, sku: product?.product?.sku }}
            layout="detail"
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
                on:click={loadProduct}
                class="btn btn-primary mr-2"
            >
                Try Again
            </button>
            <button 
                type="button"
                on:click={goBack}
                class="btn btn-outline"
            >
                Browse Products
            </button>
        </div>
    {/if}
</PageScaffold>
