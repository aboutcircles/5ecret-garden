<script lang="ts">
  import type {AggregatedCatalogItem} from '$lib/areas/market/model';
  import ProductViewer from '$lib/areas/market/ui/product/ProductViewer.svelte';

  interface Props {
    product: AggregatedCatalogItem;
    showSellerInfo?: boolean;
    ondeleted?: () => void;
    canTombstone?: boolean;
  }

  let {product, showSellerInfo, ondeleted, canTombstone = false}: Props = $props();

  import {avatarState} from '$lib/shared/state/avatar.svelte';
  import {cartState, addToCart} from '$lib/areas/market/cart/store';
  import {createOffersClientForAvatar} from '$lib/areas/market/offers';
  import { getWalletProvider } from '$lib/shared/integrations/wallet';
  import {normalizeEvmAddress as normalizeAddress} from '@circles-market/sdk';
  import {getProduct, getFirstOffer, isProductOwnedBy} from '$lib/areas/market/services';
  import {productAndOfferToDraft} from '$lib/areas/market/utils/offer';
  import {openFlowPopup, popupControls, type PopupContentDefinition} from '$lib/shared/state/popup';
import { ProductDetailsPopup } from '$lib/areas/market/ui';
  import OfferStep1 from '$lib/areas/market/flows/offer/1_Product.svelte';
  import ActionButton from '$lib/shared/ui/primitives/ActionButton.svelte';
  import {gnosisConfig} from "$lib/shared/config/circles";
  import { openInfoPopup } from '$lib/shared/ui/shell/confirmDialogs';

  const OPERATOR = gnosisConfig.production.marketOperator;

  const prod = $derived(getProduct(product));
  const offer = $derived(getFirstOffer(prod));

  const currentAvatar = $derived(
    (avatarState.avatar?.address ?? avatarState.avatar?.avatarInfo?.avatar ?? '').toLowerCase()
  );

  const cartLoading = $derived($cartState.loading);

  const isOwner = $derived(isProductOwnedBy(product, currentAvatar));

  import { getAddToCartState } from '$lib/areas/market/cart/addToCartUi';
  const effectiveAvailabilityIri = $derived<string | null>(
    (product as any)?.availability ?? (product?.product as any)?.availability ?? null
  );
  const effectiveInventoryValue = $derived<number | null>(
    ((product as any)?.inventoryLevel?.value ?? (product?.product as any)?.inventoryLevel?.value ?? null) as number | null
  );
  const addState = $derived(
    getAddToCartState({
      product,
      offer,
      currentAvatar,
      cartLoading,
      availabilityIri: effectiveAvailabilityIri,
      inventoryValue: effectiveInventoryValue,
    })
  );

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
        chainId: gnosisConfig.production.marketChainId ?? 100,
        ethereum: eth,
        pinApiBase: gnosisConfig.production.marketApiBase ?? "",
      });

      await offers.tombstone({
        avatar: seller as any,
        operator: OPERATOR as any,
        chainId: gnosisConfig.production.marketChainId ?? 100,
        sku: prod?.sku ?? product.product?.sku,
      });

      ondeleted?.();
      await openInfoPopup({ title: 'Listing removed', message: 'Product removed (tombstoned).', tone: 'success' });
    } catch (e) {
      console.error('Tombstone failed', e);
      await openInfoPopup({ title: 'Remove failed', message: 'Failed to remove product.', tone: 'error' });
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

  function isInteractiveTarget(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el) return false;
    const interactive = el.closest('button, a, input, select, textarea, [role="button"], [data-no-card-open]');
    if (!interactive) return false;
    // Allow clicks on the card root itself; it's also role="button".
    return !interactive.isSameNode(el) && !interactive.classList.contains('product-card-root');
  }

  // Handle card click to open product details popup
  function handleProductClick(event?: MouseEvent | KeyboardEvent): void {
    if (event && isInteractiveTarget(event.target)) {
      return;
    }

    const seller = product.seller?.toLowerCase();
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

    openFlowPopup({
      title: 'Edit Offer',
      component: OfferStep1,
      props: {
        context: {
          operator: OPERATOR,
          pinApiBase: gnosisConfig.production.marketApiBase ?? "",
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
    <ActionButton
      action={handleTombstone}
      title="Remove listing"
      theme={{
        Ready: 'btn-outline btn-error',
        Working: 'btn-disabled',
        Error: 'btn-warning',
        Retry: 'btn-warning',
        Done: 'btn-success',
        Disabled: 'btn-disabled'
      }}
    >
      {#snippet children()}Remove{/snippet}
    </ActionButton>
  {/if}

  {#if addState.showButton}
    <button
        type="button"
        class="btn btn-sm btn-outline"
        onclick={(e) => { e.stopPropagation(); handleAddToBasket(); }}
        disabled={!addState.canAdd}
            title={addState.reason}
          >
            {addState.label}
    </button>
  {/if}
{/snippet}

{#if product}
  <div
      class="product-card-root bg-base-100 border border-base-300 rounded-xl overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer"
      role="button"
      tabindex="0"
      aria-label={`Open product details: ${prod?.name ?? product?.product?.name ?? 'Product'}`}
      onclick={(e) => handleProductClick(e)}
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
