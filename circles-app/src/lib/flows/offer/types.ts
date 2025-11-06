export type Address = `0x${string}`;

export type OfferDraft = {
  // Product
  sku: string;
  name: string;
  description?: string;
  image?: string;
  url?: string;
  brand?: string;
  mpn?: string;
  gtin13?: string;
  category?: string;

  // Offer
  price?: number;
  priceCurrency?: string; // ISO-4217, e.g. "EUR"
  checkout?: string;      // absolute URL
  availability?: string;  // schema IRI
  availabilityFeed?: string;
  inventoryFeed?: string;
  urlProduct?: string;    // not used; kept for future extension
  sellerName?: string;
};

export interface OfferFlowContext {
  operator: Address;      // marketplace namespace key (address)
  draft?: OfferDraft;     // carried through steps
  result?: unknown;       // optional: store appendOffer result
}
