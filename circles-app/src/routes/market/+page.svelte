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

    // ————————————————————————————————————————————
    // Offer builder UI state (UI only; no writes)
    // ————————————————————————————————————————————
    let offerModalOpen: boolean = $state(false);

    // Product fields
    let p_name = $state('');
    let p_description = $state('');
    let p_sku = $state('');
    let p_images = $state<string>(''); // newline-separated URLs
    let p_url = $state('');
    let p_dateCreated = $state(''); // ISO-8601 UTC
    let p_dateModified = $state(''); // ISO-8601 UTC

    // Offer fields
    let o_price: number | '' = $state('');
    let o_priceCurrency = $state('');
    let o_availabilityFeed = $state('');
    let o_inventoryFeed = $state('');
    let o_url = $state('');
    let o_sellerAddress = $state(''); // 0x…
    let o_sellerName = $state('');
    let o_priceValidUntil = $state('');
    let o_dateModified = $state('');

    const SKU_REGEX = /^[a-z0-9][a-z0-9-_]{0,62}$/;

    function parseImages(input: string): any[] {
        const lines = (input || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        return lines.map((s) => s);
    }

    function isIsoUtc(s: string): boolean {
        if (!s) return true; // optional
        return /Z$/.test(s) && !isNaN(Date.parse(s));
    }

    function isUri(s: string): boolean {
        if (!s) return true;
        try { new URL(s); return true; } catch { return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s); }
    }

    function buildProductJson(): any {
        const images = parseImages(p_images);
        const offers: any[] = [];
        const offer: any = { '@type': 'Offer' };
        if (o_price !== '' && o_price !== null) offer.price = Number(o_price);
        if (o_priceCurrency) offer.priceCurrency = o_priceCurrency.trim();
        if (o_availabilityFeed) offer.availabilityFeed = o_availabilityFeed.trim();
        if (o_inventoryFeed) offer.inventoryFeed = o_inventoryFeed.trim();
        if (o_url) offer.url = o_url.trim();
        if (o_priceValidUntil) offer.priceValidUntil = o_priceValidUntil.trim();
        if (o_dateModified) offer.dateModified = o_dateModified.trim();
        if (o_sellerAddress) {
            offer.seller = {
                '@type': 'Organization',
                '@id': `eip155:100:${o_sellerAddress.trim()}`,
                ...(o_sellerName ? { name: o_sellerName.trim() } : {})
            };
        }
        // include offer only if it has some content
        if (Object.keys(offer).length > 1) offers.push(offer);

        const product: any = {
            '@context': [
                'https://schema.org/',
                'https://aboutcircles.com/contexts/circles-market/'
            ],
            '@type': 'Product',
        };
        if (p_name) product.name = p_name.trim();
        if (p_description) product.description = p_description.trim();
        if (p_sku) product.sku = p_sku.trim();
        if (images.length) product.image = images;
        if (offers.length) product.offers = offers;
        if (p_url) product.url = p_url.trim();
        if (p_dateCreated) product.dateCreated = p_dateCreated.trim();
        if (p_dateModified) product.dateModified = p_dateModified.trim();
        return product;
    }

    function validationErrors(): string[] {
        const errs: string[] = [];
        if (p_sku && !SKU_REGEX.test(p_sku)) errs.push('SKU must match ^[a-z0-9][a-z0-9-_]{0,62}$.');
        const imgs = parseImages(p_images);
        for (const u of imgs) {
            if (typeof u === 'string' && u.length === 0) errs.push('Image URL must not be empty.');
        }
        // priceCurrency required when price present
        if (o_price !== '' && !o_priceCurrency) errs.push('priceCurrency is required when price is set.');
        // basic URI checks
        for (const [label, val] of [['availabilityFeed', o_availabilityFeed], ['inventoryFeed', o_inventoryFeed], ['offer.url', o_url], ['product.url', p_url]] as const) {
            if (val && !isUri(val)) errs.push(`${label} must be a valid URI.`);
        }
        for (const [label, val] of [['product.dateCreated', p_dateCreated], ['product.dateModified', p_dateModified], ['offer.priceValidUntil', o_priceValidUntil], ['offer.dateModified', o_dateModified]] as const) {
            if (val && !isIsoUtc(val)) errs.push(`${label} should be ISO-8601 UTC like 2024-08-22T10:00:00Z.`);
        }
        return errs;
    }

    function pretty(obj: any): string {
        try { return JSON.stringify(obj, null, 2); } catch { return ''; }
    }

    function copyJson() {
        const json = pretty(buildProductJson());
        navigator.clipboard?.writeText(json).catch(() => {});
    }

    function downloadJson() {
        const json = pretty(buildProductJson());
        const blob = new Blob([json], { type: 'application/ld+json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (p_sku || 'product') + '.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }
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

    <svelte:fragment slot="actions">
        <button class="btn btn-sm btn-secondary" on:click={() => offerModalOpen = true}>Offer</button>
    </svelte:fragment>

    <!-- Collapsed summary -->
    <svelte:fragment slot="collapsed-left">
        <span class="text-base md:text-lg font-semibold tracking-tight text-base-content">
      Marketplace
    </span>
    </svelte:fragment>

    <svelte:fragment slot="collapsed-menu">
        <button
                type="button"
                class="btn btn-secondary min-h-0 h-[var(--collapsed-h)] md:h-[var(--collapsed-h-md)] w-full justify-start px-3"
                on:click={() => { offerModalOpen = true; }}
        >
            Offer
        </button>
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
                                        src={pickImageUrl(prod) || ''}
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
                                                    href={(offer.checkout || offer.Checkout) || ''}
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

    {#if offerModalOpen}
        <div class="fixed inset-0 z-50 flex items-center justify-center">
            <div class="absolute inset-0 bg-base-300/70" on:click={() => offerModalOpen = false}></div>
            <div class="relative bg-base-100 border border-base-300 rounded-xl shadow-xl w-[96vw] max-w-5xl max-h-[90vh] overflow-hidden">
                <div class="p-4 border-b border-base-300 flex items-center justify-between">
                    <div class="font-semibold">Create Offer — Product JSON-LD</div>
                    <button class="btn btn-ghost btn-sm" on:click={() => offerModalOpen = false}>Close</button>
                </div>
                <div class="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-auto max-h-[calc(90vh-4rem)]">
                    <div class="space-y-4">
                        <div>
                            <div class="font-semibold mb-2">Product</div>
                            <label class="form-control w-full mb-2">
                                <div class="label"><span class="label-text">Name</span></div>
                                <input class="input input-bordered w-full" bind:value={p_name} placeholder="Classic Tee" />
                            </label>
                            <label class="form-control w-full mb-2">
                                <div class="label"><span class="label-text">Description</span></div>
                                <textarea class="textarea textarea-bordered w-full" rows="2" bind:value={p_description} placeholder="Unisex cotton tee." />
                            </label>
                            <label class="form-control w-full mb-2">
                                <div class="label"><span class="label-text">SKU (^[a-z0-9][a-z0-9-_]{0,62}$)</span></div>
                                <input class="input input-bordered w-full" bind:value={p_sku} placeholder="tee-classic-black" />
                            </label>
                            <label class="form-control w-full mb-2">
                                <div class="label"><span class="label-text">Images (one absolute URI per line)</span></div>
                                <textarea class="textarea textarea-bordered w-full" rows="3" bind:value={p_images} placeholder="ipfs://Qm.../front.jpg&#10;https://cdn.example.com/front.jpg" />
                            </label>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <label class="form-control w-full">
                                    <div class="label"><span class="label-text">Product URL (optional)</span></div>
                                    <input class="input input-bordered w-full" bind:value={p_url} placeholder="https://shop.example.com/products/tee" />
                                </label>
                                <div></div>
                                <label class="form-control w-full">
                                    <div class="label"><span class="label-text">dateCreated (ISO UTC)</span></div>
                                    <input class="input input-bordered w-full" bind:value={p_dateCreated} placeholder="2024-08-22T10:00:00Z" />
                                </label>
                                <label class="form-control w-full">
                                    <div class="label"><span class="label-text">dateModified (ISO UTC)</span></div>
                                    <input class="input input-bordered w-full" bind:value={p_dateModified} placeholder="2024-08-22T10:30:00Z" />
                                </label>
                            </div>
                        </div>

                        <div>
                            <div class="font-semibold mb-2">Offer</div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <label class="form-control w-full">
                                    <div class="label"><span class="label-text">Price</span></div>
                                    <input type="number" step="0.00000001" class="input input-bordered w-full" bind:value={o_price} placeholder="19" />
                                </label>
                                <label class="form-control w-full">
                                    <div class="label"><span class="label-text">Currency (ISO-4217)</span></div>
                                    <input class="input input-bordered w-full" bind:value={o_priceCurrency} placeholder="EUR" />
                                </label>
                                <label class="form-control w-full">
                                    <div class="label"><span class="label-text">Checkout URL</span></div>
                                    <input class="input input-bordered w-full" bind:value={o_url} placeholder="https://shop.example.com/checkout?id=..." />
                                </label>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                <label class="form-control w-full">
                                    <div class="label"><span class="label-text">availabilityFeed (URI)</span></div>
                                    <input class="input input-bordered w-full" bind:value={o_availabilityFeed} placeholder="https://api.example.com/availability/tee" />
                                </label>
                                <label class="form-control w-full">
                                    <div class="label"><span class="label-text">inventoryFeed (URI)</span></div>
                                    <input class="input input-bordered w-full" bind:value={o_inventoryFeed} placeholder="https://api.example.com/inventory/tee" />
                                </label>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                <label class="form-control w-full">
                                    <div class="label"><span class="label-text">Seller address (0x…)</span></div>
                                    <input class="input input-bordered w-full" bind:value={o_sellerAddress} placeholder="0xseller..." />
                                </label>
                                <label class="form-control w-full">
                                    <div class="label"><span class="label-text">Seller name</span></div>
                                    <input class="input input-bordered w-full" bind:value={o_sellerName} placeholder="TeeCo" />
                                </label>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                <label class="form-control w-full">
                                    <div class="label"><span class="label-text">priceValidUntil (ISO UTC)</span></div>
                                    <input class="input input-bordered w-full" bind:value={o_priceValidUntil} placeholder="2024-08-22T10:30:00Z" />
                                </label>
                                <label class="form-control w-full">
                                    <div class="label"><span class="label-text">dateModified (ISO UTC)</span></div>
                                    <input class="input input-bordered w-full" bind:value={o_dateModified} placeholder="2024-08-22T10:30:00Z" />
                                </label>
                            </div>
                        </div>

                        {#if validationErrors().length}
                            <div class="alert alert-warning text-sm">
                                <div>
                                    <div class="font-semibold">Please fix the following before publishing later:</div>
                                    <ul class="list-disc pl-5">
                                        {#each validationErrors() as e}
                                            <li>{e}</li>
                                        {/each}
                                    </ul>
                                </div>
                            </div>
                        {/if}
                        <div class="flex gap-2">
                            <button class="btn btn-primary btn-sm" on:click={copyJson}>Copy JSON</button>
                            <button class="btn btn-outline btn-sm" on:click={downloadJson}>Download</button>
                            <span class="text-xs opacity-60 self-center">UI only; no on-chain write yet.</span>
                        </div>
                    </div>

                    <div>
                        <div class="font-semibold mb-2">Preview (schema.org Product)</div>
                        <textarea class="textarea textarea-bordered w-full font-mono text-xs" rows="24" readonly>{pretty(buildProductJson())}</textarea>
                    </div>
                </div>
            </div>
        </div>
    {/if}
</PageScaffold>
