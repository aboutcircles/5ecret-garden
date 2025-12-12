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
    import {createProfilesOffersClient, type SafeSignerLike} from '$lib/offers/client';
    import {createMetaMaskSafeSigner} from '$lib/safeSigner/signers/metamask';
    import {mkCirclesBindings} from '$lib/offers/mkCirclesBindings';
    import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
    import {get} from 'svelte/store';
    import {getProduct, getFirstOffer, isProductOwnedBy, resolvePayTo} from '$lib/market/catalogHelpers';
    import { productAndOfferToDraft } from '$lib/utils/offer';
    import { popupControls, type PopupContentDefinition } from '$lib/stores/popUp';
    import ProductDetailsPopup from '$lib/market/ProductDetailsPopup.svelte';
    import OfferStep1 from '$lib/flows/offer/1_Product.svelte';

    // Marketplace operator (centralized)
    const OPERATOR = MARKET_OPERATOR;

    let prod = $state<any>(null);
    let offer = $state<any>(null);

    // Current connected avatar address (reactive): keep in sync with wallet/avatar changes
    const currentAvatar = $derived(
        (avatarState.avatar?.address ?? avatarState.avatar?.avatarInfo?.avatar ?? '').toLowerCase()
    );

    // In Svelte 5 runes mode, use $derived instead of legacy $:
    const cartLoading = $derived($cartState.loading);

    const isOwner = $derived(isProductOwnedBy(product, currentAvatar));

    // PayAction presence for UI enabling
    const payTo = $derived(offer ? resolvePayTo(offer) : ({ address: null } as any));
    const hasPayAction = $derived(!!payTo.address);
    const canAdd = $derived(!!offer && hasPayAction && !!currentAvatar && !cartLoading);

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

            const seller = normalizeAddress(product.seller as string) as typeof product.seller;
            const bindings = mkCirclesBindings(MARKET_API_BASE, sdk);

            const safeSigner: SafeSignerLike = createMetaMaskSafeSigner({
                ethereum: eth,
                account: eoa as any,
                chainId: BigInt(GNOSIS_CHAIN_ID_NUM),
                safeAddress: seller,
                enforceChainId: true,
            });

            const client = createProfilesOffersClient(bindings, safeSigner);

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

    // Map current product + first offer into an OfferDraft and open the edit flow
    function handleEdit(): void {
        if (!isOwner) {
            return;
        }

        const productCore = getProduct(product) as any;
        const firstOffer = getFirstOffer(productCore) as any;

        const draft = productAndOfferToDraft(productCore, firstOffer);

        popupControls.open({
            title: 'Edit Offer',
            component: OfferStep1,
            props: {
                context: {
                    operator: OPERATOR,
                    pinApiBase: MARKET_API_BASE,
                    draft,
                    editMode: true,
                }
            },
            onClose: () => {
                try { ondeleted?.(); } catch {}
            }
        });
    }

    // Update derived values when product changes
    $effect(() => {
        prod = getProduct(product);
        offer = getFirstOffer(prod);
    });

</script>

{#if product}
    <div
            class="bg-base-100 border border-base-300 rounded-xl overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer"
            role="button"
            tabindex="0"
            aria-label={`Open product details: ${prod?.name ?? product?.product?.name ?? 'Product'}`}
            onclick={handleProductClick}
            onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleProductClick();
                }
            }}
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
                            class="btn btn-sm btn-outline"
                            onclick={(e) => { e.stopPropagation(); handleEdit(); }}
                            title="Edit listing"
                    >
                        Edit
                    </button>
                    <button
                            type="button"
                            class="btn btn-sm btn-outline btn-error"
                            onclick={(e) => { e.stopPropagation(); handleTombstone(); }}
                            title="Remove listing"
                    >
                        Remove
                    </button>
                {/if}

                <button
                        type="button"
                        class="btn btn-sm btn-outline"
                        onclick={(e) => { e.stopPropagation(); handleAddToBasket(); }}
                        disabled={!canAdd}
                        title={!currentAvatar
          ? 'Connect a Circles account first'
          : (!offer
            ? 'No offer available'
            : (!hasPayAction
              ? 'This item has no PayAction; cannot add to basket'
              : 'Add to basket'))}
                >
                    Add to basket
                </button>
            </svelte:fragment>
        </ProductViewer>
    </div>
{:else}
    <div>Product data not available</div>
{/if}
