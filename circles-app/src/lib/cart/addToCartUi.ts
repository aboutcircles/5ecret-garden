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
  disabledReason: string;
};

export function getAddToCartState(inputs: AddToCartInputs): AddToCartState {
  const { product, currentAvatar, cartLoading } = inputs;
  const offer = inputs.offer ?? (product?.product ? getFirstOffer(product.product) : null);
  const payTo = offer ? resolvePayTo(offer) : { address: null } as any;
  const hasPay = !!payTo.address;

  if (!currentAvatar) {
    return { canAdd: false, disabledReason: UI_COPY.connectAvatarFirst };
  }
  if (!offer) {
    return { canAdd: false, disabledReason: 'No offer available' };
  }
  if (!hasPay) {
    return { canAdd: false, disabledReason: 'This item can’t be purchased yet' };
  }
  if (cartLoading) {
    // Disabled while cart is mutating to avoid duplicate adds
    return { canAdd: false, disabledReason: UI_COPY.basketUpdating };
  }
  return { canAdd: true, disabledReason: UI_COPY.addToBasket };
}
