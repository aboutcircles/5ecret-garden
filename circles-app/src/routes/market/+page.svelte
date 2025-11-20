<script lang="ts">
    import {onMount} from 'svelte';
    import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
    import {popupControls} from '$lib/stores/popUp';
    import OfferStep1 from '$lib/flows/offer/1_Product.svelte';
    import ProductCard from '$lib/components/ProductCard.svelte';
    import ProfileExplorer from "$lib/flows/offer/ProfileExplorer.svelte";
    import { MARKET_API_BASE, MARKET_OPERATOR } from '$lib/config/market';
    import { cartItemCount } from '$lib/cart/store';
    import CartPanel from '$lib/cart/CartPanel.svelte';
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

    function openBasket(): void {
        popupControls.open({
            title: 'Basket',
            component: CartPanel,
            props: {
                catalog: products,
            },
        });
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

        <button
                type="button"
                class="btn btn-sm btn-ghost ml-2"
                onclick={openBasket}
                disabled={$cartItemCount === 0}
        >
            Basket ({$cartItemCount})
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

        <button
                type="button"
                class="btn btn-ghost min-h-0 h-[var(--collapsed-h)] md:h-[var(--collapsed-h-md)] w-full justify-start px-3"
                onclick={openBasket}
                disabled={$cartItemCount === 0}
        >
            Basket ({$cartItemCount})
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
