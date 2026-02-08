<script lang="ts">
    import {onMount} from 'svelte';
    import { page } from '$app/stores';
    import PageScaffold from '$lib/shared/ui/shell/PageScaffold.svelte';
    import {popupControls} from '$lib/shared/state/popup';
    import OfferStep1 from '$lib/areas/market/flows/offer/1_Product.svelte';
    import ProductCard from '$lib/areas/market/ui/product/ProductCard.svelte';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import type { AggregatedCatalogItem } from '$lib/areas/market/model';
    import { getMarketClient } from '$lib/shared/integrations/market';
    import { shortenAddress } from '$lib/shared/utils/shared';
    import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import ActionButtonBar from '$lib/shared/ui/shell/ActionButtonBar.svelte';
    import ActionButtonDropDown from '$lib/shared/ui/shell/ActionButtonDropDown.svelte';
    import type { Action } from '$lib/shared/ui/shell/actions';
    import {gnosisConfig} from "$lib/shared/config/circles";

    
    // Derive seller address from SvelteKit's $page store
    const params = $derived($page.params as { seller: string });
    
    // Current connected avatar (lowercased for comparison)
    const currentAvatar = $derived(
      (avatarState.avatar?.address ?? avatarState.avatar?.avatarInfo?.avatar ?? '').toLowerCase()
    );
    
    // Seller from route params, lowercased
    const sellerFromRoute = $derived((params.seller ?? '').toLowerCase());
    
    // True when viewing your own seller profile
    const isSelfSeller = $derived(
      !!currentAvatar && !!sellerFromRoute && currentAvatar === sellerFromRoute
    );
    
    // Static API base

    type ProductLike = AggregatedCatalogItem;

    let loading: boolean = $state(true);
    let errorMsg: string = $state('');
    let products: ProductLike[] = $state([]);
    let sellerAddress: `0x${string}` | null = $state(null);

    const shortAddr = (a?: string) => (a ? shortenAddress(a as any) : '');

    // ————————————————————————————————————————————
    // data load
    // ————————————————————————————————————————————
    async function loadSellerCatalog(): Promise<void> {
      loading = true;
      errorMsg = '';
      products = [];
      sellerAddress = null;

      try {
        const normalized = normalizeAddress(params.seller);
        sellerAddress = normalized as `0x${string}`;

        const catalog = getMarketClient().catalog.forOperator(gnosisConfig.production.marketOperator);
        const items = await catalog.fetchSellerCatalog(normalized);
        // fetchSellerCatalog already filters by seller, but keep this defensive filter
        products = items.filter(
          (p) => (p.seller ?? '').toLowerCase() === normalized.toLowerCase(),
        );
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';
        errorMsg = msg;
      } finally {
        loading = false;
      }
    }

    // No longer needed complex unwrap helpers due to strong typing

    onMount(loadSellerCatalog);

    function openCreateListing() {
      popupControls.open({
        title: 'Create Offer',
        component: OfferStep1,
        props: { context: { operator: gnosisConfig.production.marketOperator, pinApiBase: gnosisConfig.production.marketApiBase } },
        onClose: () => { void loadSellerCatalog(); }
      });
    }

    const actions: Action[] = [
      // { id: 'create-offer', label: 'Create Listing', variant: 'primary', onClick: openCreateListing }
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
        <h1 class="h2 m-0">Seller Profile</h1>
    {/snippet}

    {#snippet meta()}
        {#if sellerAddress}
            Seller: {shortAddr(sellerAddress)}
        {:else}
            Seller Profile
        {/if}
    {/snippet}

    {#snippet headerActions()}
        <ActionButtonBar {actions} />
    {/snippet}

    <!-- Collapsed summary -->
    {#snippet collapsedLeft()}
        <span class="text-base md:text-lg font-semibold tracking-tight text-base-content">
      Seller Profile
    </span>
    {/snippet}

    {#snippet collapsedMenu()}
        <ActionButtonDropDown {actions} />
    {/snippet}

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
                    {#each products as p (p.productCid)}
                        <ProductCard 
                          product={p} 
                          showSellerInfo={false}
                          ondeleted={() => loadSellerCatalog()}
                          canTombstone={isSelfSeller}
                        />
                    {/each}
                </div>
            {/if}
        </section>
    {/if}
</PageScaffold>
