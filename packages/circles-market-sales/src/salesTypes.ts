// SellerOrderDto (response shape) per guide:
// - @context: https://schema.org/
// - @type: "Order"
// - orderNumber: string (same as orderId)
// - orderStatus: string (IRI)
// - orderDate: string (RFC 3339)
// - paymentReference: string|null
// - broker: Organization identifier (opaque)
// - acceptedOffer: Offer[] — filtered to this seller
// - orderedItem: OrderItem[] — filtered to this seller
// - totalPaymentDue: PriceSpecification|null — conservative
// - outbox: OrderOutboxItemDto[] — optional, already filtered if present

export type SellerOrderDto = {
  '@context': 'https://schema.org/';
  '@type': 'Order';
  orderNumber: string;
  orderStatus: string;
  orderDate: string;
  paymentReference: string | null;
  broker: any;
  acceptedOffer: any[];
  orderedItem: any[];
  totalPaymentDue: any | null;
  outbox?: any[];
  // forward compatibility with extra fields
  [k: string]: unknown;
};

export type SellerOrdersPage = { items: SellerOrderDto[] };

export type OrderId = string & { readonly __brand: 'OrderId' };

export function isOrderId(s: string): s is OrderId {
  return /^ord_[0-9A-F]{32}$/.test(s);
}
