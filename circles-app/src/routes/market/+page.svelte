<script lang="ts">
    import {onMount} from 'svelte';
    import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
    import {popupControls} from '$lib/stores/popUp';
    import OfferStep1 from '$lib/flows/offer/1_Product.svelte';
    import ProductCard from '$lib/components/ProductCard.svelte';
    import ProfileExplorer from "$lib/flows/offer/ProfileExplorer.svelte";
    import { MARKET_API_BASE, MARKET_OPERATOR } from '$lib/config/market';
    import type { AggregatedCatalog, AggregatedCatalogItem } from '$lib/market/types';

    // Defaults (as requested)
    const OPERATOR: `0x${string}` = MARKET_OPERATOR;
    const AVATAR: `0x${string}` = '0x31d5d15c558fbfbbbe604c9c11eb42c9afbf5140';

    const API_BASE = MARKET_API_BASE;

    type ProductLike = AggregatedCatalogItem;

    let loading: boolean = $state(true);
    let errorMsg: string = $state('');
    let products: ProductLike[] = $state([]);

    import { extractProducts } from '$lib/market/catalogHelpers';
    import { shortenAddress } from '$lib/utils/shared';
    const shortAddr = (a?: string) => (a ? shortenAddress(a as any) : '');

    // ————————————————————————————————————————————
    // data load
    // ————————————————————————————————————————————
    async function loadCatalog(): Promise<void> {
        loading = true;
        errorMsg = '';
        products = [];

        const url = `${API_BASE}/api/operator/${OPERATOR}/catalog?avatars=${AVATAR}&avatars=0x1327c3cf61c6df3e0cf69faa4590281d6f675ce5&avatars=0xde374ece6fa50e781e81aac78e811b33d16912c7`;
        try {
            const res = await fetch(url, {headers: {Accept: 'application/ld+json'}});
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

    // Basket button moved to global header; inline basket trigger removed here

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
        <button
                class="btn btn-sm btn-secondary"
                onclick={() =>
      popupControls.open({
        title: 'Create Offer',
        component: OfferStep1,
        props: {
            context: {
                operator: OPERATOR,
                pinApiBase: API_BASE
            }
        },   // ← pass operator and pinApiBase
        onClose: () => { void loadCatalog(); }        // ← refresh after closing
      })
    }
        >
            Create offer
        </button>
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
                onclick={() =>
      popupControls.open({
        title: 'Create Offer',
        component: OfferStep1,
        props: { context: { operator: OPERATOR, pinApiBase: API_BASE } },
        onClose: () => { void loadCatalog(); }
      })
    }
        >
            Offer
        </button>

        <!-- Basket button moved to global header -->
    </svelte:fragment>

    {#if loading}
        <section class="bg-base-100 border border-base-300 rounded-xl p-4">
            <div class="flex items-center justify-between mb-3">
                <div class="text-sm">
                    <strong>Products</strong>
                    <span class="opacity-70"> (loading)</span>
                </div>
                <div class="loading loading-spinner loading-sm" aria-label="loading"></div>
            </div>

            <!-- Stable skeleton grid to prevent layout jumps -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-sveltekit-preload-data="hover">
                {#each Array(6) as _, i}
                    <div class="bg-base-100 border border-base-300 rounded-xl overflow-hidden flex flex-col">
                        <!-- Image placeholder (fixed height) -->
                        <div class="w-full h-44 skeleton"></div>

                        <!-- Body -->
                        <div class="p-3 flex flex-col gap-1">
                            <!-- Title (2 lines reserved) -->
                            <div class="min-h-[3rem]">
                                <div class="skeleton h-4 w-3/4 mb-2"></div>
                                <div class="skeleton h-4 w-1/2"></div>
                            </div>

                            <!-- Price row (reserved height) -->
                            <div class="min-h-[1.5rem] flex items-center justify-between">
                                <div class="skeleton h-4 w-16"></div>
                                <div class="skeleton h-5 w-20 rounded-full"></div>
                            </div>

                            <!-- Meta row (reserved height) -->
                            <div class="min-h-[1.5rem] flex items-center">
                                <div class="skeleton h-4 w-24"></div>
                            </div>

                            <!-- Actions row (reserved height) -->
                            <div class="min-h-[2.25rem] flex items-center justify-between mt-2">
                                <div class="inline-flex gap-2 items-center">
                                    <div class="skeleton h-8 w-28 rounded-lg"></div>
                                </div>
                                <div class="skeleton h-8 w-16 rounded-lg"></div>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </section>
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
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-sveltekit-preload-data="hover">
                    {#each products as p (p.productCid ?? p.id ?? p.sku ?? JSON.stringify(p))}
                        <ProductCard
                            product={p}
                            showSellerInfo={true}
                            ondeleted={() => loadCatalog()}
                        />
                    {/each}
                </div>
            {/if}
        </section>
    {/if}
</PageScaffold>
