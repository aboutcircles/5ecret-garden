import type { Address } from '@circles-sdk/utils';

export type SchemaOrgThingRef = { '@id': string };
export type SchemaOrgPropertyValue = {
  '@type': 'PropertyValue';
  propertyID: string;
  value: string;
  name?: string;
};

export type SchemaOrgPayAction = {
  '@type': 'PayAction';
  price?: number;
  priceCurrency?: string;
  recipient?: SchemaOrgThingRef; // {"@id":"eip155:{chainId}:{address}"}
  instrument?: SchemaOrgPropertyValue; // propertyID=="eip155", value=="{chainId}:{address}"
};

export type SchemaOrgOfferLite = {
  '@type': 'Offer';
  price?: number;
  priceCurrency?: string;
  availabilityFeed?: string;
  inventoryFeed?: string;
  // Optional non-feed stock information per spec §4.1
  inventoryLevel?: { '@type': 'QuantitativeValue'; value: number; unitCode?: string };
  url?: string;
  availableDeliveryMethod?: string;
  // Fields used by UI components at runtime
  availability?: string; // IRI like https://schema.org/InStock
  checkout?: string;     // External checkout URL
  // New: schema.org action(s)
  potentialAction?: SchemaOrgPayAction | SchemaOrgPayAction[];
};

export type SchemaOrgProductLite = {
  '@context': (string | object)[];
  '@type': 'Product';
  sku: string;
  name: string;
  description?: string;
  image?: unknown;
  url?: string;
  brand?: string;
  mpn?: string;
  gtin13?: string;
  category?: string;
  offers: SchemaOrgOfferLite[];
};

export type AggregatedCatalogItem = {
  seller: Address;
  productCid: string;
  publishedAt: number;
  linkKeccak: string;
  indexInChunk: number;
  product: SchemaOrgProductLite;
};

export type AggregatedCatalog = {
  '@context': unknown;
  '@type': string;
  operator: Address;
  chainId: number;
  window: { start: number; end: number };
  avatarsScanned: Address[];
  products: AggregatedCatalogItem[];
  errors: unknown[];
};
