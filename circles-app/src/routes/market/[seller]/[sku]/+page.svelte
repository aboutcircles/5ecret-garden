<script lang="ts">
    import { onMount } from 'svelte';
    import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
    import ProductGallery from '$lib/components/ProductGallery.svelte';
    import Avatar from '$lib/components/avatar/Avatar.svelte';
    import {goto} from "$app/navigation";
    import { MARKET_API_BASE, MARKET_OPERATOR } from '$lib/config/market';
    import type { AggregatedCatalog, AggregatedCatalogItem } from '$lib/market/types';
    import { normalizeAddress } from '$lib/offers/adapters';

    // Get seller and SKU from URL parameters
    const { params } = $props<{ params: { seller: string; sku: string } }>();
    
    // Defaults (as requested)
    const OPERATOR: `0x${string}` = MARKET_OPERATOR;
    
    // Static API base
    const API_BASE = MARKET_API_BASE;

    type ProductLike = AggregatedCatalogItem;

    let loading: boolean = $state(true);
    let errorMsg: string = $state('');
    let product: ProductLike | null = $state(null);

    // Helper functions (typed-first with fallback for older dev servers)
    function extractProducts(body: any): AggregatedCatalogItem[] {
        const typed = (body as AggregatedCatalog | undefined)?.products;
        if (Array.isArray(typed)) return typed as AggregatedCatalogItem[];
        if (Array.isArray((body as any)?.items)) return (body as any).items as AggregatedCatalogItem[];
        if (Array.isArray((body as any)?.results)) return (body as any).results as AggregatedCatalogItem[];
        if ((body as any)?.catalog && Array.isArray((body as any).catalog.products)) return (body as any).catalog.products as AggregatedCatalogItem[];
        return [] as AggregatedCatalogItem[];
    }

    function shortAddr(a?: string): string {
        if (!a) return '';
        return a.slice(0, 6) + '…' + a.slice(-4);
    }

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

    const prod = $derived(() => product ? getProduct(product) : null);
    const offer = $derived(() => prod ? getFirstOffer(prod) : null);
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
            <h1 class="text-xl font-semibold truncate">{prod?.name || prod?.Name || 'Product Details'}</h1>
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
    {:else if product}
        <!-- Product Images -->
        {#if product.product?.image || product.product?.images}
            <ProductGallery images={product.product.image || product.product.images} />
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
            {#if product.seller}
                <div class="flex items-center gap-3 p-3 bg-base-100 rounded-lg">
                    <Avatar 
                        address={product.seller || ''}
                        view="horizontal" 
                        clickable={true}
                    />
                    <a 
                        href={`/market/${encodeURIComponent(product.seller)}`}
                        class="btn btn-sm btn-ghost"
                    >
                        View Profile
                    </a>
                </div>
            {/if}

            <!-- Product Name -->
            <h2 class="text-2xl font-bold">{product.product?.name || product.product?.Name || '(no name)'}</h2>

            <!-- Description -->
            {#if product.product?.description || product.product?.Description}
                <div class="prose prose-sm max-w-none">
                    {@html product.product.description || product.product.Description}
                </div>
            {:else if product.product?.text}
                <div class="prose prose-sm max-w-none">
                    {@html product.product.text}
                </div>
            {/if}

            <!-- Offer Information -->
            {#if product.product?.offers && product.product.offers[0]}
                <div class="bg-base-100 rounded-lg p-4 space-y-2">
                    <h3 class="font-semibold">Offer Details</h3>
                    
                    <div class="flex items-center justify-between">
                        <span class="text-sm text-base-content/70">Price:</span>
                        <span class="font-medium">{product.product.offers[0].price ?? product.product.offers[0].Price ?? '?'}</span>
                    </div>

                    {#if product.product.offers[0]?.priceCurrency || product.product.offers[0]?.PriceCurrency}
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-base-content/70">Currency:</span>
                            <span>{product.product.offers[0].priceCurrency || product.product.offers[0].PriceCurrency}</span>
                        </div>
                    {/if}

                    <!-- Checkout Button -->
                    {#if typeof (product.product.offers[0]?.checkout ?? product.product.offers[0]?.Checkout) === 'string' && (product.product.offers[0].checkout || product.product.offers[0].Checkout).trim() !== ''}
                        <a
                            href={product.product.offers[0].checkout || product.product.offers[0].Checkout}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="btn btn-primary w-full mt-4"
                        >
                            Purchase Now
                        </a>
                    {/if}
                </div>
            {/if}

            <!-- External Links -->
            <div class="flex flex-wrap gap-2">
                {#if product.product?.url || product.product?.Url}
                    <a 
                        href={product.product.url || product.product.Url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        class="btn btn-outline btn-sm"
                    >
                        Visit Product Site
                    </a>
                {/if}

                {#if product.productCid}
                    <a 
                        href={'https://ipfs.io/ipfs/' + encodeURIComponent(product.productCid)}
                        target="_blank" 
                        rel="noopener noreferrer"
                        class="btn btn-outline btn-sm"
                    >
                        View on IPFS
                    </a>
                {/if}
            </div>

            <!-- Product Metadata -->
            <div class="text-xs text-base-content/50 space-y-1">
                {#if product.id}
                    <div>Product ID: {product.id}</div>
                {/if}

                {#if product.sku}
                    <div>SKU: {product.sku}</div>
                {/if}

                {#if product.productCid}
                    <div>CID: {product.productCid}</div>
                {/if}

                {#if typeof (product.publishedAt) === 'number'}
                    <div>Published: {new Date(product.publishedAt * 1000).toLocaleString()}</div>
                {/if}
            </div>
        </div>
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
