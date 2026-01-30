<script lang="ts">
    import {onMount} from 'svelte';
    import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
    import {popupControls} from '$lib/stores/popup';
    import OfferStep1 from '$lib/flows/offer/1_Product.svelte';
    import ProductCard from '$lib/components/ProductCard.svelte';
    import { getMarketClient } from '$lib/sdk/marketClient';
    import type { AggregatedCatalogItem } from '$lib/market/types';
    import ActionButtonBar from '$lib/components/layout/ActionButtonBar.svelte';
    import ActionButtonDropDown from '$lib/components/layout/ActionButtonDropDown.svelte';
    import type { Action } from '$lib/types/actions';
    import { avatarState } from '$lib/stores/avatar.svelte';
    import Tabs from '$lib/components/tabs/Tabs.svelte';
    import Tab from '$lib/components/tabs/Tab.svelte';
    import {gnosisConfig} from "$lib/circlesConfig";

    // Defaults (as requested)
    const OPERATOR: `0x${string}` = gnosisConfig.production.marketOperator;

    const API_BASE = gnosisConfig.production.marketApiBase;

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
    // Operators tabs (API supports one operator at a time)
    // Currently fixed to the default operator.
    // ————————————————————————————————————————————
    function getScanOperators(): `0x${string}`[] {
      return [gnosisConfig.production.marketOperator as `0x${string}`];
    }

    // Cache operator list for the current render to avoid recomputing in the template
    let scanOperators: `0x${string}`[] = $derived(getScanOperators());

    let selectedOperator: `0x${string}` | null = $state(null);

    // Keep selection valid when avatar changes or settings change (by re-evaluating list on demand)
    $effect(() => {
      const ops = scanOperators;
      if (!ops || ops.length === 0) {
        selectedOperator = gnosisConfig.production.marketOperator as `0x${string}`;
        return;
      }
      if (!selectedOperator || !ops.includes(selectedOperator)) {
        selectedOperator = ops[0];
      }
    });

    // Reload when operator changes
    $effect(() => {
      const op = selectedOperator;
      if (!op) return;
      void loadFirstPage(true);
    });

    // ————————————————————————————————————————————
    // data load with pagination
    // ————————————————————————————————————————————
    const defaultAvatars: `0x${string}`[] = [
      '0xde374ece6fa50e781e81aac78e811b33d16912c7',
      '0x636f44a378da9256a128b104b1e06aa50a578f33'
    ];
    const avatarAddress = $derived((avatarState.avatar?.address ?? avatarState.avatar?.avatarInfo?.avatar ?? '') as `0x${string}` | '');
    function getScanAvatars(): `0x${string}`[] {
      const set = new Set<string>();
      for (const a of defaultAvatars) set.add(a.toLowerCase());
      return Array.from(set) as `0x${string}`[];
    }

    async function loadFirstPage(keepProducts: boolean = false): Promise<void> {
      loading = true;
      errorMsg = '';
      if (!keepProducts) {
        products = [];
      }
      nextCursor = null;
      hasMore = false;

      try {
        const op = (selectedOperator ?? (gnosisConfig.production.marketOperator as `0x${string}`)) as `0x${string}`;
        const catalog = getMarketClient().catalog.forOperator(op);
        const page = await catalog.fetchCatalogPage({ avatars: getScanAvatars(), pageSize: PAGE_SIZE, chainId: 100 });
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
        const op = (selectedOperator ?? (gnosisConfig.production.marketOperator as `0x${string}`)) as `0x${string}`;
        const catalog = getMarketClient().catalog.forOperator(op);
        const page = await catalog.fetchCatalogPage({ avatars: getScanAvatars(), pageSize: PAGE_SIZE, chainId: 100, cursor: nextCursor });
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

      // initial load is triggered by selectedOperator effect
      // void loadFirstPage();

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
      const op = (selectedOperator ?? (gnosisConfig.production.marketOperator as `0x${string}`)) as `0x${string}`;
      popupControls.open({
        title: 'Create Offer',
        component: OfferStep1,
        props: { context: { operator: op, pinApiBase: API_BASE } },
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
        Namespace {shortAddr(selectedOperator ?? OPERATOR)} • All offers
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

    {#if loading && products.length === 0}
        <section class="bg-base-100 border border-base-300 rounded-xl p-4">
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
            <!-- Operators tabs -->
            {#if scanOperators.length > 1}
              <div class="mb-3 flex items-center justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <Tabs bind:selected={selectedOperator} size="sm" variant="bordered">
                    {#each scanOperators as op (op)}
                      <Tab id={op} title={shortAddr(op)} />
                    {/each}
                  </Tabs>
                </div>
                {#if loading && products.length > 0}
                  <div class="ml-2 flex-none">
                    <div class="loading loading-spinner loading-xs" aria-label="loading"></div>
                  </div>
                {/if}
              </div>
            {/if}

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
