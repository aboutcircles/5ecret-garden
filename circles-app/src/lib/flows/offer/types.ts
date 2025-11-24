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
  availabilityFeed?: string;
  inventoryFeed?: string;
  urlProduct?: string;    // not used; kept for future extension
  availableDeliveryMethod?: string; // GoodRelations IRI (e.g. http://purl.org/goodrelations/v1#DeliveryModePickUp)
};

export interface OfferFlowContext {
  operator: Address;      // marketplace namespace key (address)
  draft?: OfferDraft;     // carried through steps
  result?: unknown;       // optional: store appendOffer result
  pinApiBase?: string;    // ← NEW: market API base for pinning
}
