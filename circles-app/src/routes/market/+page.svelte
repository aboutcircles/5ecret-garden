<script lang="ts">
    import {onMount} from 'svelte';
    import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
    import {popupControls} from '$lib/stores/popup';
    import OfferStep1 from '$lib/flows/offer/1_Product.svelte';
    import ProductCard from '$lib/components/ProductCard.svelte';
    import { MARKET_API_BASE, MARKET_OPERATOR } from '$lib/config/market';
    import { getMarketClient } from '$lib/sdk/marketClient';
    import type { AggregatedCatalogItem } from '$lib/market/types';
    import ActionButtonBar from '$lib/components/layout/ActionButtonBar.svelte';
    import ActionButtonDropDown from '$lib/components/layout/ActionButtonDropDown.svelte';
    import type { Action } from '$lib/types/actions';

    // Defaults (as requested)
    const OPERATOR: `0x${string}` = MARKET_OPERATOR;
    const AVATAR: `0x${string}` = '0x31d5d15c558fbfbbbe604c9c11eb42c9afbf5140';

    const API_BASE = MARKET_API_BASE;

    type ProductLike = AggregatedCatalogItem;

    let loading: boolean = $state(true);
    let errorMsg: string = $state('');
    let products: ProductLike[] = $state([]);
    let nextCursor: string | null = $state(null);
    let hasMore: boolean = $state(false);

    // Infinite scroll sentinel and observer
    let sentinel: HTMLDivElement | null = $state(null);
    let io: IntersectionObserver | null = null;
    let observed: Element | null = null;

    // Reactively (un)observe the sentinel when it changes or when hasMore toggles
    $effect(() => {
      if (!io) return;
      const target = hasMore ? sentinel : null;
      if (observed && observed !== target) {
        io.unobserve(observed);
        observed = null;
      }
      if (target && observed !== target) {
        io.observe(target);
        observed = target;
      }
    });

    import { shortenAddress } from '$lib/utils/shared';
    const shortAddr = (a?: string) => (a ? shortenAddress(a as any) : '');

    const PAGE_SIZE = 20;

    // ————————————————————————————————————————————
    // data load with pagination
    // ————————————————————————————————————————————
    const avatars: `0x${string}`[] = [
      '0x1327c3cf61c6df3e0cf69faa4590281d6f675ce5',
      '0xde374ece6fa50e781e81aac78e811b33d16912c7',
      '0x314278c65545f0f96f8fe0836ad92b3326bfff2e'
    ];

    async function loadFirstPage(): Promise<void> {
      loading = true;
      errorMsg = '';
      products = [];
      nextCursor = null;
      hasMore = false;

      try {
        const catalog = getMarketClient().catalog.forOperator(MARKET_OPERATOR);
        const page = await catalog.fetchCatalogPage({ avatars, pageSize: PAGE_SIZE, chainId: 100 });
        products = page.items;
        nextCursor = page.nextCursor;
        hasMore = !!nextCursor;
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';
        errorMsg = msg;
      } finally {
        loading = false;
      }
    }

    async function loadNextPage(): Promise<void> {
      if (!nextCursor || loading) return;
      loading = true;
      errorMsg = '';
      try {
        const catalog = getMarketClient().catalog.forOperator(MARKET_OPERATOR);
        const page = await catalog.fetchCatalogPage({ avatars, pageSize: PAGE_SIZE, chainId: 100, cursor: nextCursor });
        products = products.concat(page.items);
        nextCursor = page.nextCursor;
        hasMore = !!nextCursor;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';
        // Treat 416 as end-of-results if bubbled
        if (msg.includes('416')) {
          hasMore = false;
        } else {
          errorMsg = msg;
        }
      } finally {
        loading = false;
      }
    }

    onMount(() => {
      // Initialize IntersectionObserver for infinite scroll
      io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            // Guard with `loading` and `hasMore` to avoid duplicate fetches
            if (!loading && hasMore) {
              void loadNextPage();
            }
          }
        }
      }, { root: null, rootMargin: '600px 0px 600px 0px', threshold: 0 });

      void loadFirstPage();

      return () => {
        if (io) {
          try {
            if (observed) io.unobserve(observed);
          } catch {}
          try {
            io.disconnect();
          } catch {}
          io = null;
          observed = null;
        }
      };
    });

    // Basket button moved to global header; inline basket trigger removed here

    function openCreateOffer() {
      popupControls.open({
        title: 'Create Offer',
        component: OfferStep1,
        props: { context: { operator: OPERATOR, pinApiBase: API_BASE } },
        onClose: () => { void loadFirstPage(); }
      });
    }

    const actions: Action[] = [
      { id: 'create-offer', label: 'Create offer', variant: 'primary', onClick: openCreateOffer }
    ];

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
    {#snippet title()}
        <h1 class="h2 m-0">Marketplace</h1>
    {/snippet}

    {#snippet meta()}
        Namespace {shortAddr(OPERATOR)} • Avatar {shortAddr(AVATAR)} • All offers
    {/snippet}

    {#snippet headerActions()}
        <ActionButtonBar {actions} />
    {/snippet}

    <!-- Collapsed summary -->
    {#snippet collapsedLeft()}
        <span class="text-base md:text-lg font-semibold tracking-tight text-base-content">
      Marketplace
    </span>
    {/snippet}

    {#snippet collapsedMenu()}
        <ActionButtonDropDown {actions} />
        <!-- Basket button moved to global header -->
    {/snippet}

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
                    {#each products as p (p.productCid)}
                        <ProductCard
                            product={p}
                            showSellerInfo={true}
                            ondeleted={() => loadFirstPage()}
                        />
                    {/each}
                </div>
                {#if hasMore}
                    <!-- Infinite scroll sentinel: observed by IntersectionObserver to auto-load next page -->
                    <div bind:this={sentinel} class="h-2 w-full"></div>
                    <!-- Fallback manual button for accessibility -->
                    <div class="flex justify-center mt-4">
                        <button class="btn btn-outline" disabled={loading} onclick={loadNextPage}>
                            {loading ? 'Loading…' : 'Load more'}
                        </button>
                    </div>
                {/if}
            {/if}
        </section>
    {/if}
</PageScaffold>
