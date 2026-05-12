export type CheckoutResult = { orderId: string; paymentReference: string; basketId: string };

export type BasketLine = {
  seller?: unknown;
  sku?: unknown;
  orderedItem?: {
    sku?: unknown;
    orderedItem?: {
      sku?: unknown;
    };
    [k: string]: unknown;
  };
  orderQuantity?: unknown;
  quantity?: unknown;
  imageUrl?: unknown;
  offerSnapshot?: {
    price?: number;
    priceCurrency?: string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
};

export type PostalAddress = {
  '@type'?: string;
  streetAddress?: string;
  addressLocality?: string;
  postalCode?: string;
  addressCountry?: string;
  [k: string]: unknown;
};

export type ContactPoint = {
  '@type'?: string;
  email?: string;
  telephone?: string;
  [k: string]: unknown;
};

export type Basket = {
  basketId: string;
  buyer?: string;
  operator?: string;
  chainId?: number;
  status: string;
  items: BasketLine[];
  shippingAddress?: PostalAddress;
  billingAddress?: PostalAddress;
  contactPoint?: ContactPoint;
  ageProof?: { '@type'?: string; birthDate?: string; [k: string]: unknown };
  customer?: { '@type'?: string; givenName?: string; familyName?: string; [k: string]: unknown };
  [k: string]: unknown;
};

export type CartState = {
  loading: boolean;
  lastError: string | null;

  basket: Basket | null;
  validation: unknown | null;
  orderPreview: unknown | null;
  lastCheckout: CheckoutResult | null;
};

export type OrderItemPreview = {
  '@type': 'OrderItem';
  orderQuantity: number;
  orderedItem: { '@type': 'Product'; sku: string };
  seller: string;
  imageUrl?: string;
};

export type BasketPatch = {
  items?: OrderItemPreview[];
  shippingAddress?: unknown;
  billingAddress?: unknown;
  ageProof?: unknown;
  contactPoint?: unknown;
  customer?: unknown;
  ttlSeconds?: number;
};

export type SdkCartItem = {
  seller: string;
  sku: string;
  quantity: number;
  imageUrl?: string;
};

/**
 * Coerce an SDK {@link import('@circles-market/cart').Basket} (which has
 * stricter item types and an index signature) into the local {@link Basket}
 * shape used throughout the cart module.
 *
 * The runtime shapes are identical -- this only exists to satisfy the
 * structural mismatch between the SDK's `BasketItem` and the local
 * `BasketLine` (different `offerSnapshot` / nested `orderedItem` types).
 */
export function toLocalBasket(sdkBasket: { basketId: string; [k: string]: unknown }): Basket {
  return sdkBasket as unknown as Basket;
}
