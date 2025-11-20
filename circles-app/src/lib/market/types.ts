import type { Address } from '@circles-sdk/utils';

export type SchemaOrgOfferLite = {
  '@type': 'Offer';
  price?: number;
  priceCurrency?: string;
  checkout: string;
  availability?: string;
  availabilityFeed?: string;
  inventoryFeed?: string;
  url?: string;
  sellerName?: string;
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
