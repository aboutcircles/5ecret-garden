export type Address = `0x${string}`;

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
  recipient?: SchemaOrgThingRef;
  instrument?: SchemaOrgPropertyValue;
};

export type SchemaOrgOfferLite = {
  '@type': 'Offer';
  price?: number;
  priceCurrency?: string;
  availabilityFeed?: string;
  inventoryFeed?: string;
  inventoryLevel?: { '@type': 'QuantitativeValue'; value: number; unitCode?: string };
  url?: string;
  availableDeliveryMethod?: string;
  availability?: string;
  checkout?: string;
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