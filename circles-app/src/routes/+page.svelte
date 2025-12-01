<script lang="ts">
    import ActionButton from '$lib/components/ActionButton.svelte';
    import {popupControls} from '$lib/stores/popUp';
    import SelectWallet from '$lib/components/SelectWallet.svelte';
    import ProductCard from '$lib/components/ProductCard.svelte';
    import { fetchGlobalCatalog } from '$lib/market/catalogClient';
    import type { AggregatedCatalogItem } from '$lib/market/types';
    import { onMount } from 'svelte';

    async function connectWallet() {
        popupControls.open({
            component: SelectWallet,
            title: 'Select Wallet',
            props: {},
        });
    }

    // Marketplace data
    let loadingMarketplace: boolean = $state(true);
    let marketplaceError: string = $state('');
    let marketplaceProducts: AggregatedCatalogItem[] = $state([]);

    async function loadMarketplace(): Promise<void> {
        loadingMarketplace = true;
        marketplaceError = '';
        
        try {
            marketplaceProducts = await fetchGlobalCatalog();
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';
            marketplaceError = msg;
        } finally {
            loadingMarketplace = false;
        }
    }

    onMount(() => {
        loadMarketplace();
    });

</script>


<div class="page page-stack page--lg">
    <div class="min-h-screen flex flex-col items-center justify-center text-center">
        <img src="./illustration.png" alt="illustration" class="max-w-[340px]"/>
        <h1 class="text-5xl font-medium">Money, Reimagined</h1>
        <p class="py-6 px-2 max-w-2xl">
            Mint personal Circles, build trust, and manage your community groups with the Circles Core app
        </p>
        <ActionButton action={connectWallet}>Connect Wallet</ActionButton>
        
        <!-- Marketplace listings section -->
<!--        <div class="w-full max-w-6xl mt-12 pt-8 border-t border-base-300">-->
<!--            <div class="flex flex-col items-center mb-8">-->
<!--                <h2 class="text-3xl font-bold mb-2">Featured Marketplace Items</h2>-->
<!--                <p class="text-gray-600 max-w-xl text-center">-->
<!--                    Discover amazing products from our community members-->
<!--                </p>-->
<!--            </div>-->
<!--            -->
<!--            {#if loadingMarketplace}-->
<!--                <div class="flex justify-center py-12">-->
<!--                    <div class="loading loading-spinner loading-lg" aria-label="loading marketplace"></div>-->
<!--                </div>-->
<!--            {:else if marketplaceError}-->
<!--                <div class="alert alert-error text-center max-w-2xl mx-auto">-->
<!--                    Failed to load marketplace items: {marketplaceError}-->
<!--                </div>-->
<!--            {:else if marketplaceProducts.length === 0}-->
<!--                <div class="text-center py-12 text-gray-500">-->
<!--                    No marketplace items available at the moment.-->
<!--                </div>-->
<!--            {:else}-->
<!--                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">-->
<!--                    {#each marketplaceProducts.slice(0, 3) as product (product.productCid ?? product.id ?? product.sku ?? JSON.stringify(product))}-->
<!--                        <ProductCard -->
<!--                            product={product} -->
<!--                            showSellerInfo={true}-->
<!--                        />-->
<!--                    {/each}-->
<!--                </div>-->
<!--                <div class="text-center">-->
<!--                    <a href="/market" class="btn btn-primary btn-wide">View All Marketplace Items</a>-->
<!--                </div>-->
<!--            {/if}-->
<!--        </div>-->
    </div>
</div>
