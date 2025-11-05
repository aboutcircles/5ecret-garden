<script lang="ts">
    import { onMount } from 'svelte';
    import PageScaffold from '$lib/components/layout/PageScaffold.svelte';

    // Defaults (as requested)
    const OPERATOR: `0x${string}` = '0x31d5d15c558fbfbbbe604c9c11eb42c9afbf5140';
    const AVATAR: `0x${string}`   = '0x31d5d15c558fbfbbbe604c9c11eb42c9afbf5140';

    // Static API base from your note
    const API_BASE = 'https://static.174.163.76.144.clients.your-server.de/market';

    type ProductLike = any;

    let loading: boolean = $state(true);
    let errorMsg: string = $state('');
    let products: ProductLike[] = $state([]);

    // ————————————————————————————————————————————
    // helpers (kept small; tolerant of schema variants)
    // ————————————————————————————————————————————
    function pickImageUrl(product: any): string | null {
        const imgs = product?.image ?? product?.images;
        if (typeof imgs === 'string') { return imgs; }
        if (Array.isArray(imgs)) {
            for (const it of imgs) {
                if (!it) continue;
                if (typeof it === 'string') return it;
                if (typeof it?.url === 'string') return it.url;
                if (typeof it?.Url === 'string') return it.Url;
                if (typeof it?.object?.contentUrl === 'string') return it.object.contentUrl;
                if (typeof it?.Object?.ContentUrl === 'string') return it.Object.ContentUrl;
            }
        }
        if (typeof product?.imageUrl === 'string') return product.imageUrl;
        if (typeof product?.ImageUrl === 'string') return product.ImageUrl;
        return null;
    }

    function getProduct(item: any): any {
        // Some backends wrap as { product, seller, productCid }
        return item?.product ?? item;
    }

    function getFirstOffer(prod: any): any | null {
        const o = prod?.offers ?? prod?.offer ?? prod?.Offers ?? prod?.Offer;
        if (!o) return null;
        if (Array.isArray(o)) return o[0] ?? null;
        if (typeof o === 'object') return o;
        return null;
    }

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
    async function loadCatalog(): Promise<void> {
        loading = true;
        errorMsg = '';
        products = [];

        const url = `${API_BASE}/api/operator/${OPERATOR}/catalog?avatars=${AVATAR}`;
        try {
            const res = await fetch(url, { headers: { Accept: 'application/ld+json' } });
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`);
            }
            const body = await res.json();
            products = extractProducts(body);
        } catch (err: any) {
            errorMsg = err?.message ?? String(err);
        } finally {
            loading = false;
        }
    }

    onMount(loadCatalog);
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
        <h1 class="h2 m-0">Marketplace</h1>
    </svelte:fragment>

    <svelte:fragment slot="meta">
        Namespace {shortAddr(OPERATOR)} • Avatar {shortAddr(AVATAR)} • All offers
    </svelte:fragment>

    <!-- Collapsed summary -->
    <svelte:fragment slot="collapsed-left">
    <span class="text-base md:text-lg font-semibold tracking-tight text-base-content">
      Marketplace
    </span>
    </svelte:fragment>

    {#if loading}
        <div class="flex flex-col items-center justify-center h-[50vh]">
            <div class="loading loading-spinner loading-lg" aria-label="loading"></div>
            <div class="mt-3 text-base-content/70">Loading catalog…</div>
        </div>
    {:else if errorMsg}
        <div class="alert alert-error">
            <span class="font-semibold">Failed to load:</span>&nbsp;{errorMsg}
        </div>
    {:else}
        <section class="bg-base-100 border border-base-300 rounded-xl p-4">
            <div class="flex items-center justify-between mb-3">
                <div class="text-sm">
                    <strong>Products</strong>
                    <span class="opacity-70">{products.length ? ` (${products.length})` : ''}</span>
                </div>
            </div>

            {#if products.length === 0}
                <div class="text-sm opacity-60">No products returned by the API.</div>
            {:else}
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {#each products as p (p.productCid ?? p.id ?? p.sku ?? JSON.stringify(p))}
                        {@const prod = getProduct(p)}
                        {@const offer = getFirstOffer(prod)}
                        <div class="bg-base-100 border border-base-300 rounded-xl overflow-hidden flex flex-col">
                            {#if pickImageUrl(prod)}
                                <img
                                        class="w-full h-44 object-cover"
                                        alt={prod?.name || prod?.Name || 'product-image'}
                                        loading="lazy"
                                        src={pickImageUrl(prod) as string}
                                />
                            {:else}
                                <div class="w-full h-44 bg-base-200 text-base-content/50 flex items-center justify-center text-xs">
                                    No image
                                </div>
                            {/if}

                            <div class="p-3 flex flex-col gap-1">
                                <div class="font-semibold truncate">{prod?.name || prod?.Name || '(no name)'}</div>

                                {#if prod?.description || prod?.Description}
                                    <div class="text-xs opacity-70 line-clamp-3">
                                        {prod?.description || prod?.Description}
                                    </div>
                                {/if}

                                {#if offer}
                                    <div class="text-xs">
                                        Offer: {offer.price ?? offer.Price ?? '?'}
                                        {offer.priceCurrency || offer.PriceCurrency || ''}
                                        {#if typeof offer?.availability === 'string'}
                                            ({offer.availability})
                                        {:else if offer?.availability?.name || offer?.availability?.Name}
                                            ({offer.availability.name || offer.availability.Name})
                                        {/if}
                                    </div>
                                {/if}

                                <div class="text-xs opacity-60">
                                    {shortAddr(p.seller || prod?.seller || '')}
                                    {#if typeof (p.publishedAt ?? prod?.publishedAt) === 'number'}
                                        &nbsp;·&nbsp;{new Date(((p.publishedAt ?? prod?.publishedAt)) * 1000).toISOString()}
                                    {/if}
                                </div>

                                <div class="flex items-center justify-between mt-2">
                                    <div class="inline-flex gap-2">
                                        {#if offer && typeof (offer.checkout || offer.Checkout) === 'string' && (offer.checkout || offer.Checkout).trim() !== ''}
                                            <a
                                                    class="btn btn-sm btn-primary"
                                                    title="Open checkout"
                                                    target="_blank"
                                                    rel="noopener"
                                                    href={(offer.checkout || offer.Checkout) as string}
                                            >Buy</a>
                                        {/if}
                                    </div>
                                    <div class="inline-flex items-center gap-2">
                                        {#if prod?.url || prod?.Url}
                                            <a class="link link-primary text-xs" href={prod?.url || prod?.Url} target="_blank" rel="noopener">Product</a>
                                        {/if}
                                        {#if p.productCid || prod?.productCid}
                                            <a class="link text-xs" href={'https://ipfs.io/ipfs/' + encodeURIComponent(p.productCid || prod?.productCid)} target="_blank" rel="noopener">Raw JSON</a>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </section>
    {/if}
</PageScaffold>
