<script lang="ts">
    import {onMount} from 'svelte';
    import { page } from '$app/stores';
    import PageScaffold from '$lib/shared/ui/shell/PageScaffold.svelte';
    import {openFlowPopup, popupControls} from '$lib/shared/state/popup';
    import OfferStep1 from '$lib/areas/market/flows/offer/1_Product.svelte';
    import ProductCard from '$lib/areas/market/ui/product/ProductCard.svelte';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import type { AggregatedCatalogItem } from '$lib/areas/market/model';
    import { getMarketClient } from '$lib/shared/data/market/marketClientProxy';
    import { shortenAddress } from '$lib/shared/utils/shared';
    import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import ActionButtonBar from '$lib/shared/ui/shell/ActionButtonBar.svelte';
    import ActionButtonDropDown from '$lib/shared/ui/shell/ActionButtonDropDown.svelte';
    import type { Action } from '$lib/shared/ui/shell/actions';
    import {gnosisConfig} from "$lib/shared/config/circles";
    import { T } from '$lib/design-system/tokens.js';

    
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
      openFlowPopup({
        title: 'Create Offer',
        component: OfferStep1,
        props: { context: { operator: gnosisConfig.production.marketOperator, pinApiBase: gnosisConfig.production.profilePinningServiceUrl } },
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
    <section style="
        background:linear-gradient(160deg,{T.lilacSoft} 0%,{T.surface} 100%);
        border:1px solid {T.hairlineSoft};border-radius:18px;
        box-shadow:{T.shadow.xs};
        padding:24px 22px;margin-bottom:18px;
        display:flex;flex-direction:column;align-items:center;gap:12px;
    ">
        {#if sellerAddress}
            <Avatar
                address={params.seller || ''}
                view="vertical"
                clickable={false}
            />
        {:else if errorMsg}
            <div style="background:{T.negativeSoft};border:1px solid rgba(196,68,48,0.2);border-radius:10px;padding:8px 12px;font-size:12px;color:{T.inkBody};">
                Invalid seller address
            </div>
        {/if}
    </section>

    <!-- Listings Section -->
    {#if loading}
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:40vh;gap:10px;">
            <div class="loading loading-spinner loading-lg" style="color:{T.primary};" aria-label="loading"></div>
            <div style="font-size:12.5px;color:{T.inkMuted};">Loading listings…</div>
        </div>
    {:else if errorMsg}
        <section style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;padding:14px 16px;">
            <div style="background:{T.negativeSoft};border:1px solid rgba(196,68,48,0.2);border-radius:10px;padding:10px 12px;font-size:12.5px;color:{T.inkBody};">
                <strong>Failed to load:</strong> {errorMsg}
            </div>
        </section>
    {:else}
        <section style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;padding:14px 16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;">
                <div>
                    <h3 style="font-family:{T.fontSans};font-size:13px;font-weight:580;color:{T.ink};margin:0;">Listings</h3>
                    <p style="font-size:11.5px;color:{T.inkMuted};margin:2px 0 0 0;">
                        {products.length ? `${products.length} active listing${products.length === 1 ? '' : 's'}` : 'No active listings yet'}
                    </p>
                </div>
            </div>

            {#if products.length === 0}
                <div style="text-align:center;padding:40px 0;display:flex;flex-direction:column;align-items:center;gap:10px;">
                    <div style="width:56px;height:56px;border-radius:16px;background:{T.surfaceAlt};display:inline-flex;align-items:center;justify-content:center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={T.inkFaint}>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                    </div>
                    <div style="font-size:12.5px;color:{T.inkMuted};">No listings found for this seller</div>
                </div>
            {:else}
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;">
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
