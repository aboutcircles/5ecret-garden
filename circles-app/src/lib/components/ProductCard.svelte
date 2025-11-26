<script lang="ts">
    import {circles} from '$lib/stores/circles';
    import type {AggregatedCatalogItem} from '$lib/market/types';
    import {MARKET_OPERATOR, GNOSIS_CHAIN_ID_NUM, MARKET_API_BASE} from '$lib/config/market';
    import ProductViewer from '$lib/components/ProductViewer.svelte';

    interface Props {
        product: AggregatedCatalogItem;
        showSellerInfo?: boolean;
        ondeleted?: () => void;
        canTombstone?: boolean; // enable owner-only actions
    }

    let {product, showSellerInfo, ondeleted, canTombstone = false}: Props = $props();

    // State for derived values and ownership handling
    import {avatarState} from '$lib/stores/avatar.svelte';
    import {cartState, addToCart} from '$lib/cart/store';
    import {createProfilesOffersClient} from '$lib/offers/client';
    import {createMetaMaskSafeSigner} from '$lib/safeSigner/signers/metamask';
    import {mkCirclesBindings} from '$lib/offers/mkCirclesBindings';
    import {normalizeAddress} from '$lib/offers/adapters';
    import {get} from 'svelte/store';
    import {getProduct, getFirstOffer, isProductOwnedBy} from '$lib/market/catalogHelpers';
    import { popupControls, type PopupContentDefinition } from '$lib/stores/popUp';
    import ProductDetailsPopup from '$lib/market/ProductDetailsPopup.svelte';

    // Marketplace operator (centralized)
    const OPERATOR = MARKET_OPERATOR;

    let prod = $state<any>(null);
    let offer = $state<any>(null);

    // Current connected avatar address (reactive)
    const currentAvatar = avatarState?.avatar?.address?.toLowerCase()

    // In Svelte 5 runes mode, use $derived instead of legacy $:
    const cartLoading = $derived($cartState.loading);

    const isOwner = $derived(isProductOwnedBy(product, currentAvatar));

    // Delete / tombstone handling for owners
    async function handleTombstone(): Promise<void> {
        // Runtime guard: even if button renders due to some logic bug, prevent action
        if (!isOwner) {
            console.warn('[ProductCard] tombstone requested for non-owner item; ignoring', {
                seller: product?.seller,
                currentAvatar,
            });
            return;
        }
        try {
            const eth: any = (window as any).ethereum;
            if (!eth) throw new Error('MetaMask not available');
            const accounts: string[] = await eth.request({method: 'eth_requestAccounts'});
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

            // Notify parent to refresh listings if provided
            try {
                ondeleted?.();
            } catch (e) { /* noop */
            }
            alert('Product removed (tombstoned).');
        } catch (e) {
            console.error('Tombstone failed', e);
            alert('Failed to remove product.');
        }
    }

    async function handleAddToBasket(): Promise<void> {
        try {
            await addToCart(product, currentAvatar);
        } catch (e) {
            console.error('[cart] addToCart failed:', e);
        }
    }

    // product/offer helpers imported from catalogHelpers

    // Handle card click to open product details popup
    function handleProductClick(): void {
        const seller = (product.seller || prod?.seller)?.toLowerCase();
        const sku = product.product?.sku || (product as any).id || (product as any).productCid;

        if (seller && sku) {
            const def: PopupContentDefinition = {
                title: 'Product details',
                component: ProductDetailsPopup,
                props: { seller, sku }
            };
            popupControls.open(def);
        }
    }

    // Update derived values when product changes
    $effect(() => {
        prod = getProduct(product);
        offer = getFirstOffer(prod);
    });

    // Temporary debug to verify owner gating in environments where the Remove button misbehaves
    $effect(() => {
        // Log once per product change
        console.debug('[ProductCard:isOwner]', {
            productSeller: product?.seller,
            currentAvatar,
            isOwner,
        });
    });
</script>

{#if product}
    <div
            class="bg-base-100 border border-base-300 rounded-xl overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer"
            on:click={handleProductClick}
    >
        <ProductViewer
                layout="card"
                product={prod}
                offer={offer}
                seller={product.seller}
                productCid={product.productCid}
                showSeller={!!showSellerInfo}
                showMeta={!showSellerInfo}
                meta={{ publishedAt: product.publishedAt, productCid: product.productCid, sku: prod?.sku }}
        >
            <svelte:fragment slot="actions">
                {#if isOwner && canTombstone}
                    <button
                            type="button"
                            class="btn btn-sm btn-outline btn-error"
                            on:click|stopPropagation={handleTombstone}
                            title="Remove listing"
                    >
                        Remove
                    </button>
                {/if}

                <button
                        type="button"
                        class="btn btn-sm btn-outline"
                        on:click|stopPropagation={handleAddToBasket}
                        disabled={!offer || cartLoading || !currentAvatar}
                        title={!currentAvatar
          ? 'Connect a Circles account first'
          : !offer
            ? 'No offer available'
            : 'Add to basket'}
                >
                    Add to basket
                </button>
            </svelte:fragment>
        </ProductViewer>
    </div>
{:else}
    <div>Product data not available</div>
{/if}
