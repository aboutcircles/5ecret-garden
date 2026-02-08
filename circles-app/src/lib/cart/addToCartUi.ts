import type { AggregatedCatalogItem, SchemaOrgOfferLite } from '$lib/domains/market/model';
import { getFirstOffer, resolvePayTo } from '$lib/domains/market/services';
import { UI_COPY } from '$lib/shared/ui/copy';

export type AddToCartInputs = {
  product?: AggregatedCatalogItem | null;
  offer?: SchemaOrgOfferLite | null; // allow caller to pre-provide
  currentAvatar?: string | null | undefined;
  cartLoading?: boolean;
  availabilityIri?: string | null;
  inventoryValue?: number | null;
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
  const inventoryValue = inputs.inventoryValue ?? offer?.inventoryLevel?.value ?? null;
  const hasInventory = typeof inventoryValue === 'number' && Number.isFinite(inventoryValue);
  const availabilityIri = inputs.availabilityIri ?? offer?.availability ?? null;
  const isOutOfStock = typeof availabilityIri === 'string' && availabilityIri.endsWith('/OutOfStock');

  if (!offer) {
    return { canAdd: false, label: UI_COPY.addToBasket, reason: 'No offer available', showButton: true };
  }
  // Products without a fulfillment link cannot be bought - hide the button entirely
  if (!hasFulfillmentLink) {
    return { canAdd: false, label: UI_COPY.addToBasket, showButton: false };
  }
  // Explicit OutOfStock availability should hide the button
  if (isOutOfStock) {
    return { canAdd: false, label: UI_COPY.addToBasket, showButton: false };
  }
  // If we have stock info and remaining stock is 0, hide the button entirely
  if (hasInventory && inventoryValue <= 0) {
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
