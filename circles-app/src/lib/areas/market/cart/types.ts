export type CheckoutResult = { orderId: string; paymentReference: string; basketId: string };

export type BasketLine = {
  seller?: unknown;
  sku?: unknown;
  orderedItem?: {
    sku?: unknown;
    orderedItem?: {
      sku?: unknown;
    };
  };
  orderQuantity?: unknown;
  quantity?: unknown;
  imageUrl?: unknown;
};

export type PostalAddress = {
  streetAddress?: string;
  postalCode?: string;
  addressLocality?: string;
  addressCountry?: string;
};

export type Basket = {
  basketId?: string;
  buyer?: string;
  status?: string;
  items?: BasketLine[];
  shippingAddress?: PostalAddress;
  billingAddress?: PostalAddress;
  contactPoint?: { email?: string; telephone?: string };
  ageProof?: unknown;
  requirements?: { shippingAddress?: boolean; billingAddress?: boolean; contactPoint?: boolean; ageProof?: boolean };
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
