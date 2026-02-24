export interface MinimalProductInput {
  sku: string;
  name: string;
  description?: string;
  image?: string | string[];
  url?: string;
  brand?: string;
  mpn?: string;
  gtin13?: string;
  category?: string;
}

export interface MinimalOfferInput {
  price: number;
  priceCurrency: string; // e.g., "CRC" or "EUR"
  url?: string;          // optional: external landing page for the offer
  availabilityFeed?: string;
  inventoryFeed?: string;
  availableDeliveryMethod?: string; // GoodRelations IRI
  requiredSlots?: string[]; // e.g. ["contactPoint.email"]
  fulfillmentEndpoint?: string;
  fulfillmentTrigger?: 'confirmed' | 'finalized';
}
