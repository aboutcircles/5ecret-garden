<script lang="ts">
  import type {AggregatedCatalogItem} from '$lib/market/types';
  import {MARKET_OPERATOR, GNOSIS_CHAIN_ID_NUM, MARKET_API_BASE} from '$lib/config/market';
  import ProductViewer from '$lib/components/ProductViewer.svelte';

  interface Props {
    product: AggregatedCatalogItem;
    showSellerInfo?: boolean;
    ondeleted?: () => void;
    canTombstone?: boolean;
  }

  let {product, showSellerInfo, ondeleted, canTombstone = false}: Props = $props();

  import {avatarState} from '$lib/stores/avatar.svelte';
  import {cartState, addToCart} from '$lib/cart/store';
  import {createOffersClientForAvatar} from '$lib/offers/client';
  import { getWalletProvider } from '$lib/ethereum/getWalletProvider';
  import {normalizeEvmAddress as normalizeAddress} from '@circles-market/sdk';
  import {getProduct, getFirstOffer, isProductOwnedBy} from '$lib/market/catalogHelpers';
  import {productAndOfferToDraft} from '$lib/utils/offer';
  import {popupControls, type PopupContentDefinition} from '$lib/stores/popup';
  import ProductDetailsPopup from '$lib/market/ProductDetailsPopup.svelte';
  import OfferStep1 from '$lib/flows/offer/1_Product.svelte';

  const OPERATOR = MARKET_OPERATOR;

  const prod = $derived(getProduct(product));
  const offer = $derived(getFirstOffer(prod));

  const currentAvatar = $derived(
    (avatarState.avatar?.address ?? avatarState.avatar?.avatarInfo?.avatar ?? '').toLowerCase()
  );

  const cartLoading = $derived($cartState.loading);

  const isOwner = $derived(isProductOwnedBy(product, currentAvatar));

  import { getAddToCartState } from '$lib/cart/addToCartUi';
  const addState = $derived(getAddToCartState({ product, offer, currentAvatar, cartLoading }));

  // Delete / tombstone handling for owners
  async function handleTombstone(): Promise<void> {
    if (!isOwner) {
      console.warn('[ProductCard] tombstone requested for non-owner item; ignoring', {
        seller: product?.seller,
        currentAvatar,
      });
      return;
    }

    try {
      const eth = getWalletProvider();

      const seller = normalizeAddress(product.seller as string) as typeof product.seller;

      const {offers} = await createOffersClientForAvatar({
        avatar: seller as any,
        chainId: GNOSIS_CHAIN_ID_NUM,
        ethereum: eth,
        pinApiBase: MARKET_API_BASE,
      });

      await offers.tombstone({
        avatar: seller as any,
        operator: OPERATOR as any,
        chainId: GNOSIS_CHAIN_ID_NUM,
        sku: prod?.sku ?? product.product?.sku,
      });

      ondeleted?.();
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
        props: {seller, sku}
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
        try {
          ondeleted?.();
        } catch {
        }
      }
    });
  }


</script>

{#snippet actions()}
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
      disabled={!addState.canAdd}
          title={addState.reason}
        >
          {addState.label}
  </button>
{/snippet}

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
        actions={actions}
    />
  </div>
{:else}
  <div>Product data not available</div>
{/if}
