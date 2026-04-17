export type {
  OrderSnapshot,
  OrderStatusHistory,
  OrderStatusHistoryEvent,
  OrderStatusEventPayload,
} from '@circles-market/sdk';

export type OrderStatusSseEvent = import('@circles-market/sdk').OrderStatusEventPayload;
export type OrderStatusChange = import('@circles-market/sdk').OrderStatusHistoryEvent;

// ---------------------------------------------------------------------------
// Schema.org Order shapes returned by the Market API beyond the minimal
// OrderSnapshot fields.  The API returns JSON-LD with Schema.org vocabulary;
// these types capture the shapes we actually consume in the UI.
// ---------------------------------------------------------------------------

/** A Schema.org entity reference with an `@id` IRI. */
export interface SchemaOrgRef {
  '@id'?: string;
  '@type'?: string;
  [k: string]: unknown;
}

/** A Schema.org postal address embedded in an order snapshot. */
export interface SchemaOrgPostalAddress {
  '@type'?: string;
  streetAddress?: string;
  postalCode?: string;
  addressLocality?: string;
  addressCountry?: string;
  [k: string]: unknown;
}

/** A Schema.org OrderItem as returned in `orderedItem[]`. */
export interface SchemaOrgOrderItem {
  '@type'?: string;
  orderQuantity?: number;
  orderedItem?: {
    '@type'?: string;
    sku?: string;
    name?: string;
    [k: string]: unknown;
  };
  seller?: string;
  imageUrl?: string;
  productCid?: string;
  offerSnapshot?: Record<string, unknown>;
  [k: string]: unknown;
}

/** A Schema.org Offer as returned in `acceptedOffer[]`. */
export interface SchemaOrgAcceptedOffer {
  '@type'?: string;
  price?: number;
  priceCurrency?: string;
  seller?: SchemaOrgRef;
  [k: string]: unknown;
}

/** A Schema.org PriceSpecification for `totalPaymentDue`. */
export interface SchemaOrgPriceSpec {
  '@type'?: string;
  price?: number;
  priceCurrency?: string;
  [k: string]: unknown;
}

/**
 * Extended OrderSnapshot with the full set of Schema.org Order fields that
 * the Market API returns.  Use this in components that need typed access
 * to `orderedItem`, `acceptedOffer`, `customer`, `broker`, etc.
 */
export interface FullOrderSnapshot {
  orderNumber: string;
  orderStatus?: string;
  orderDate?: string;
  paymentReference?: string | null;
  outbox?: import('@circles-market/sdk').OrderOutboxItem[];

  // Schema.org Order fields beyond the minimal OrderSnapshot
  customer?: SchemaOrgRef;
  broker?: SchemaOrgRef;
  orderedItem?: SchemaOrgOrderItem[];
  acceptedOffer?: SchemaOrgAcceptedOffer[];
  totalPaymentDue?: SchemaOrgPriceSpec;
  shippingAddress?: SchemaOrgPostalAddress;
  billingAddress?: SchemaOrgPostalAddress;

  // forward-compat
  [k: string]: unknown;
}

/**
 * Seller-scoped order DTO as returned by the `/as-seller` endpoint.
 * Mirrors the shape from `@circles-market/sales` which is not directly
 * importable (transitive pnpm dep).
 */
export interface SellerOrderDto {
  '@context': 'https://schema.org/';
  '@type': 'Order';
  orderNumber: string;
  orderStatus: string;
  orderDate: string;
  paymentReference: string | null;
  broker?: SchemaOrgRef;
  acceptedOffer?: SchemaOrgAcceptedOffer[];
  orderedItem?: SchemaOrgOrderItem[];
  totalPaymentDue?: SchemaOrgPriceSpec | null;
  outbox?: import('@circles-market/sdk').OrderOutboxItem[];
  // forward compatibility
  [k: string]: unknown;
}

export interface SellerOrdersPage {
  items: SellerOrderDto[];
}
