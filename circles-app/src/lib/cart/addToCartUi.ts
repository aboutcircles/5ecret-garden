import type { AggregatedCatalogItem, SchemaOrgOfferLite } from '$lib/market/types';
import { getFirstOffer, resolvePayTo } from '$lib/market/catalogHelpers';
import { UI_COPY } from '$lib/ui/copy';

export type AddToCartInputs = {
  product?: AggregatedCatalogItem | null;
  offer?: SchemaOrgOfferLite | null; // allow caller to pre-provide
  currentAvatar?: string | null | undefined;
  cartLoading?: boolean;
};

export type AddToCartState = {
  canAdd: boolean;
  label: string;
  reason?: string;
  /** Whether the button should be shown at all. False for products without fulfillment link. */
  showButton: boolean;
};

export function getAddToCartState(inputs: AddToCartInputs): AddToCartState {
  const { product, currentAvatar, cartLoading } = inputs;
  const offer = inputs.offer ?? (product?.product ? getFirstOffer(product.product) : null);
  const payTo = offer ? resolvePayTo(offer) : { address: null };
  const hasPay = !!(payTo && (payTo as any).address);
  const hasFulfillmentLink = !!offer?.availabilityFeed;

  if (!offer) {
    return { canAdd: false, label: UI_COPY.addToBasket, reason: 'No offer available', showButton: true };
  }
  // Products without a fulfillment link cannot be bought - hide the button entirely
  if (!hasFulfillmentLink) {
    return { canAdd: false, label: UI_COPY.addToBasket, showButton: false };
  }
  if (!hasPay) {
    return { canAdd: false, label: UI_COPY.addToBasket, reason: "This item can't be purchased yet", showButton: true };
  }
  if (cartLoading) {
    // Disabled while cart is mutating to avoid duplicate adds
    return { canAdd: false, label: UI_COPY.addToBasket, reason: UI_COPY.basketUpdating, showButton: true };
  }
  return { canAdd: true, label: UI_COPY.addToBasket, showButton: true };
}
