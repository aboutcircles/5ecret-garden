<script lang="ts">
    import Avatar from './avatar/Avatar.svelte';
    import { circles } from '$lib/stores/circles';
    import { goto } from '$app/navigation';
    import type { AggregatedCatalogItem } from '$lib/market/types';
    import { MARKET_OPERATOR, GNOSIS_CHAIN_ID_NUM, MARKET_API_BASE } from '$lib/config/market';
    
    interface Props {
        product: AggregatedCatalogItem;
        showSellerInfo?: boolean;
    }
    
    let { product, showSellerInfo }: Props = $props();
    
    // State for derived values and ownership handling
    import { avatarState } from '$lib/stores/avatar.svelte';
    import { cartState, addToCart } from '$lib/cart/store';
    import { createProfilesOffersClient } from '$lib/offers/client';
    import { createMetaMaskSafeSigner } from '$lib/safeSigner/signers/metamask';
    import { mkCirclesBindings } from '$lib/offers/mkCirclesBindings';
    import { normalizeAddress } from '$lib/offers/adapters';
    import { get } from 'svelte/store';

    // Marketplace operator (centralized)
    const OPERATOR = MARKET_OPERATOR;

    let prod = $state<any>(null);
    let offer = $state<any>(null);
    let imageUrl = $state<string | null>(null);

    // Current connected avatar address (reactive)
    const currentAvatar = $derived(
      (avatarState.avatar?.address ?? avatarState.avatar?.avatarInfo?.avatar ?? '').toLowerCase()
    );

    // Buyer = current avatar (used for addToCart)
    const buyerAddress = $derived(
      (avatarState.avatar?.address ?? avatarState.avatar?.avatarInfo?.avatar) || null
    );

    const cartLoading = $derived($cartState.loading);

    const isOwner = $derived(() => {
      const seller = (product.seller ?? prod?.seller ?? '').toLowerCase();
      return !!currentAvatar && !!seller && currentAvatar === seller;
    });

    // Delete / tombstone handling for owners
    async function handleTombstone(): Promise<void> {
        try {
            const eth: any = (window as any).ethereum;
            if (!eth) throw new Error('MetaMask not available');
            const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
            const eoa = accounts[0]?.toLowerCase() ?? '';
            if (!eoa) throw new Error('No account selected');

            const sdk = get(circles);
            if (!sdk) throw new Error('Circles SDK not initialized');

            const seller = normalizeAddress(product.seller as string);
            const bindings = mkCirclesBindings(MARKET_API_BASE, sdk as any);

            const safeSigner = createMetaMaskSafeSigner({
                ethereum: eth,
                account: eoa as any,
                chainId: BigInt(GNOSIS_CHAIN_ID_NUM),
                safeAddress: seller,
                enforceChainId: true,
            });

            const client = createProfilesOffersClient(bindings as any, safeSigner as any);

            await client.tombstone({
                avatar: seller,
                operator: OPERATOR,
                sku: prod?.sku ?? product.product?.sku,
                chainId: GNOSIS_CHAIN_ID_NUM,
            });

            alert('Product removed (tombstoned).');
        } catch (e) {
            console.error('Tombstone failed', e);
            alert('Failed to remove product.');
        }
    }

    async function handleAddToBasket(): Promise<void> {
        try {
            await addToCart(product, buyerAddress);
        } catch (e) {
            console.error('[cart] addToCart failed:', e);
        }
    }

    // Helper functions (extracted from both pages)
    function pickImageUrl(product: any): string | null {
        const imgs = product?.image ?? product?.images;
        if (typeof imgs === 'string') {
            return imgs;
        }
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

    function getProduct(item: AggregatedCatalogItem): any { return item.product; }

    function getFirstOffer(prodItem: any): any | null {
        const o = prodItem?.offers ?? prodItem?.offer ?? prodItem?.Offers ?? prodItem?.Offer;
        if (!o) return null;
        if (Array.isArray(o)) return o[0] ?? null;
        if (typeof o === 'object') return o;
        return null;
    }

    function shortAddr(a?: string): string {
        if (!a) return '';
        return a.slice(0, 6) + '…' + a.slice(-4);
    }
    
    // Handle card click to navigate to detail page
    function handleProductClick(): void {
        const seller = (product.seller || prod?.seller)?.toLowerCase();
        const sku = product.product?.sku || (product as any).id || (product as any).productCid;
        
        if (seller && sku) {
            goto(`/market/${encodeURIComponent(seller)}/${encodeURIComponent(sku)}`);
        }
    }
    
    // Update derived values when product changes
    $effect(() => {
        prod = getProduct(product);
        offer = getFirstOffer(prod);
        imageUrl = pickImageUrl(prod);
    });
</script>

{#if product}
    <div 
        class="bg-base-100 border border-base-300 rounded-xl overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer"
        on:click={handleProductClick}
    >
        {#if imageUrl}
            <img
                    class="w-full h-44 object-cover"
                    alt={prod?.name || prod?.Name || 'product-image'}
                    loading="lazy"
                    src={imageUrl || ''}
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
                <div class="text-sm font-medium text-primary">
                    Offer: {offer.price ?? offer.Price ?? '?'}
                    {offer.priceCurrency || offer.PriceCurrency ? ' ' + (offer.priceCurrency || offer.PriceCurrency) : ''}
                    {#if typeof offer?.availability === 'string'}
                        ({offer.availability})
                    {:else if offer?.availability?.name || offer?.availability?.Name}
                        ({offer.availability.name || offer.availability.Name})
                    {/if}
                </div>
            {/if}

            {#if showSellerInfo && (product.seller || prod?.seller)}
                <Avatar 
                    address={product.seller || prod?.seller || ''}
                    view="horizontal" 
                    clickable={false}
                />
            {:else if !showSellerInfo && typeof (product.publishedAt ?? prod?.publishedAt) === 'number'}
                <div class="text-xs opacity-60 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Published: {new Date(((product.publishedAt ?? prod?.publishedAt)) * 1000).toLocaleDateString()}
                </div>
            {/if}

            <div class="flex items-center justify-between mt-2">
                <div class="inline-flex gap-2 items-center">
                {#if offer}
                    <button
                        type="button"
                        class="btn btn-sm btn-outline"
                        on:click|stopPropagation={handleAddToBasket}
                        disabled={cartLoading || !buyerAddress}
                        title={buyerAddress ? 'Add to basket' : 'Connect a Circles account first'}
                    >
                        Add to basket
                    </button>

                    {#if typeof (offer.checkout || offer.Checkout) === 'string' && (offer.checkout || offer.Checkout).trim() !== ''}
                        <a
                            class="btn btn-sm btn-primary"
                            title="Open checkout"
                            target="_blank"
                            rel="noopener"
                            href={(offer.checkout || offer.Checkout) || ''}
                            on:click|stopPropagation
                        >
                            Buy
                        </a>
                    {/if}
                {/if}

                {#if isOwner}
                    <button
                        type="button"
                        class="btn btn-sm btn-error"
                        on:click|stopPropagation={handleTombstone}
                    >
                        Remove
                    </button>
                {/if}
                </div>
                <div class="inline-flex items-center gap-2">
                    {#if prod?.url || prod?.Url}
                        <a class="link link-primary text-xs" href={prod?.url || prod?.Url}
                           target="_blank" rel="noopener">Product</a>
                    {/if}
                    {#if product.productCid || prod?.productCid}
                        <a class="link text-xs"
                           href={'https://ipfs.io/ipfs/' + encodeURIComponent(product.productCid || prod?.productCid)}
                           target="_blank" rel="noopener">Raw JSON</a>
                    {/if}
                </div>
            </div>
        </div>
    </div>
{:else}
    <div>Product data not available</div>
{/if}
