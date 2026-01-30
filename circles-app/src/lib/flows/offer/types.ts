import type {Address} from "@circles-sdk/utils";

export type OfferDraft = {
  // Product
  sku: string;
  name: string;
  description?: string;
  image?: string;       // Legacy support for single image
  images?: string[];    // New multiple images support
  url?: string;
  brand?: string;
  mpn?: string;
  gtin13?: string;
  category?: string;

  // Offer
  price?: number;
  priceCurrency?: string; // ISO-4217, e.g. "EUR"
  /** @deprecated Not used; kept for potential future extension. Prefer product.url and offer.url */
  urlProduct?: string;
  availableDeliveryMethod?: string; // GoodRelations IRI (e.g. http://purl.org/goodrelations/v1#DeliveryModePickUp)
  /**
   * Offer-driven basket requirements: array of opaque slot keys.
   * Recognized initial set: "contactPoint.email", "contactPoint.telephone".
   */
  requiredSlots?: string[];

  // Payment
  paymentGateway?: Address; // selected payment gateway address used for PayAction
};

export interface OfferFlowContext {
  operator: Address;      // marketplace namespace key (address)
  draft?: OfferDraft;     // carried through steps
  result?: unknown;       // optional: store appendOffer result
  pinApiBase?: string;    // ← NEW: market API base for pinning
  editMode?: boolean;     // ← when true, the flow edits an existing product (e.g., lock SKU)
}
