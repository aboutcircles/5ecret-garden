<script lang="ts">
    import {onMount} from 'svelte';
    import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
    import {popupControls} from '$lib/stores/popUp';
    import OfferStep1 from '$lib/flows/offer/1_Product.svelte';
    import ProductCard from '$lib/components/ProductCard.svelte';
    import Avatar from '$lib/components/avatar/Avatar.svelte';

    // Defaults (as requested)
    const OPERATOR: `0x${string}` = '0x31d5d15c558fbfbbbe604c9c11eb42c9afbf5140';
    
    // Get seller address from URL parameters
    const { params } = $props<{ params: { seller: string } }>();
    
    // Static API base
    const API_BASE = 'http://localhost:5084';

    type ProductLike = any;

    let loading: boolean = $state(true);
    let errorMsg: string = $state('');
    let products: ProductLike[] = $state([]);
    let sellerAddress: `0x${string}` | null = $state(null);
    let shortSellerAddr: string = '';

    // ————————————————————————————————————————————
    // helper functions (kept only those not in ProductCard)
    // ————————————————————————————————————————————
    function extractProducts(body: any): any[] {
        if (!body || typeof body !== 'object') return [];
        if (Array.isArray(body.products)) return body.products;
        if (Array.isArray(body.items)) return body.items;
        if (Array.isArray(body.results)) return body.results;
        if (body.data && typeof body.data === 'object') {
            if (Array.isArray(body.data.products)) return body.data.products;
            if (Array.isArray(body.data.items)) return body.data.items;
            if (Array.isArray(body.data.results)) return body.data.results;
        }
        if (body.catalog && Array.isArray(body.catalog.products)) return body.catalog.products;
        return [];
    }

    function shortAddr(a?: string): string {
        if (!a) return '';
        return a.slice(0, 6) + '…' + a.slice(-4);
    }

    // ————————————————————————————————————————————
    // data load
    // ————————————————————————————————————————————
    async function loadSellerCatalog(): Promise<void> {
        loading = true;
        errorMsg = '';
        
        if (!params.seller || !params.seller.startsWith('0x')) {
            errorMsg = 'Invalid seller address';
            loading = false;
            return;
        }
        
        // Validate and format the seller address
        try {
            sellerAddress = params.seller.toLowerCase() as `0x${string}`;
            shortSellerAddr = shortAddr(sellerAddress);
            
            // Fetch catalog for this specific seller
            const url = `${API_BASE}/api/operator/${OPERATOR}/catalog?avatars=${sellerAddress}`;
            const res = await fetch(url, {headers: {Accept: 'application/ld+json'}});
            
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`);
            }
            
            const body = await res.json();
            products = extractProducts(body);
            
            // Filter to only show products from this seller
            products = products.filter(p => 
                (p.seller?.toLowerCase() === sellerAddress) || 
                (getProductFromCard(p)?.seller?.toLowerCase() === sellerAddress)
            );
        } catch (err: any) {
            errorMsg = err?.message ?? String(err);
        } finally {
            loading = false;
        }
    }

    // Helper function to get product from ProductCard context
    function getProductFromCard(item: any): any {
        return item?.product ?? item;
    }

    onMount(loadSellerCatalog);

</script>

<PageScaffold
        highlight="soft"
        collapsedMode="bar"
        collapsedHeightClass="h-12"
        maxWidthClass="page page--lg"
        contentWidthClass="page page--lg"
        usePagePadding={true}
        headerTopGapClass="mt-4 md:mt-6"
        collapsedTopGapClass="mt-3 md:mt-4"
>
    <svelte:fragment slot="title">
        <h1 class="h2 m-0">Seller Profile</h1>
    </svelte:fragment>

    <svelte:fragment slot="meta">
        {#if sellerAddress}
            Seller: {shortAddr(sellerAddress)}
        {:else}
            Seller Profile
        {/if}
    </svelte:fragment>

    <svelte:fragment slot="actions">
        <button
                class="btn btn-sm btn-secondary"
                on:click={() =>
      popupControls.open({
        title: 'Create Offer',
        component: OfferStep1,
        props: { context: { operator: OPERATOR, pinApiBase: API_BASE } },
        onClose: () => { void loadSellerCatalog(); }
      })
    }
        >
            Create Listing
        </button>
    </svelte:fragment>

    <!-- Collapsed summary -->
    <svelte:fragment slot="collapsed-left">
        <span class="text-base md:text-lg font-semibold tracking-tight text-base-content">
      Seller Profile
    </span>
    </svelte:fragment>

    <svelte:fragment slot="collapsed-menu">
        <button
                type="button"
                class="btn btn-secondary min-h-0 h-[var(--collapsed-h)] md:h-[var(--collapsed-h-md)] w-full justify-start px-3"
                on:click={() =>
      popupControls.open({
        title: 'Create Offer',
        component: OfferStep1,
        props: { context: { operator: OPERATOR, pinApiBase: API_BASE } },
        onClose: () => { void loadSellerCatalog(); }
      })
    }
        >
            Create Listing
        </button>
    </svelte:fragment>

    <!-- Seller Profile Section -->
    <section class="bg-base-100 border border-base-300 rounded-xl p-4 mb-6">
        {#if sellerAddress}
            
            <div class="mt-4 flex items-center gap-3">
                <Avatar 
                    address={params.seller || ''}
                    view="vertical" 
                    clickable={false} 
                />
            </div>
        {:else if errorMsg}
            <div class="alert alert-error">
                <span>Invalid seller address</span>
            </div>
        {/if}
    </section>

    <!-- Listings Section -->
    {#if loading}
        <div class="flex flex-col items-center justify-center h-[50vh]">
            <div class="loading loading-spinner loading-lg" aria-label="loading"></div>
            <div class="mt-3 text-base-content/70">Loading listings…</div>
        </div>
    {:else if errorMsg}
        <section class="bg-base-100 border border-base-300 rounded-xl p-4">
            <div class="alert alert-error">
                <span class="font-semibold">Failed to load:</span>&nbsp;{errorMsg}
            </div>
        </section>
    {:else}
        <section class="bg-base-100 border border-base-300 rounded-xl p-4">
            <div class="flex items-center justify-between mb-3">
                <div class="text-sm">
                    <strong>Listings</strong>
                    <span class="opacity-70">{products.length ? ` (${products.length})` : ''}</span>
                </div>
            </div>

            {#if products.length === 0}
                <div class="text-center py-8 opacity-60">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-2 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <div>No listings found for this seller</div>
                </div>
            {:else}
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {#each products as p (p.productCid ?? p.id ?? p.sku ?? JSON.stringify(p))}
                        <ProductCard product={p} showSellerInfo={false} />
                    {/each}
                </div>
            {/if}
        </section>
    {/if}
</PageScaffold>
