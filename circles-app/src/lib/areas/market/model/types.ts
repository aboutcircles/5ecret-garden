export type {
  Address,
  AggregatedCatalog,
  SchemaOrgPayAction,
  SchemaOrgPropertyValue,
  SchemaOrgThingRef,
} from '@circles-market/sdk';

export type {
  AggregatedCatalogItem as AggregatedCatalogItemBase,
  SchemaOrgOfferLite as SchemaOrgOfferLiteBase,
  SchemaOrgProductLite as SchemaOrgProductLiteBase,
} from '@circles-market/sdk';

import type {
  AggregatedCatalogItem as AggregatedCatalogItemBase,
  SchemaOrgOfferLite as SchemaOrgOfferLiteBase,
  SchemaOrgProductLite as SchemaOrgProductLiteBase,
} from '@circles-market/sdk';

// ---------------------------------------------------------------------------
// Widened types: add optional fields observed at runtime but absent from the
// upstream SDK type definitions.  Using intersection types keeps the original
// shape intact while making runtime-only properties type-safe.
// ---------------------------------------------------------------------------

/**
 * Upstream SchemaOrgOfferLite extended with optional `requiredSlots` that some
 * catalog entries carry at runtime (basket requirement slots, e.g.
 * "contactPoint.email").
 */
export type SchemaOrgOfferLite = SchemaOrgOfferLiteBase & {
  requiredSlots?: string[];
};

/**
 * Upstream SchemaOrgProductLite extended with optional fields that may be
 * flattened onto the product level by certain catalog backends:
 * - `offer` / `Offer`: singular variant of `offers`
 * - `availability`: Schema.org availability IRI
 * - `inventoryLevel`: QuantitativeValue with a numeric `value`
 * - `imageUrl` / `ImageUrl`: alternative image field names
 */
export type SchemaOrgProductLite = SchemaOrgProductLiteBase & {
  offer?: SchemaOrgOfferLite;
  Offer?: SchemaOrgOfferLite;
  Offers?: SchemaOrgOfferLite[];
  availability?: string;
  inventoryLevel?: { value?: number };
  imageUrl?: string;
  ImageUrl?: string;
};

/**
 * Upstream AggregatedCatalogItem with the widened SchemaOrgProductLite and
 * optional runtime-only fields that some catalog API responses include:
 * - `offer` / `offers`: flattened offer(s) from the product
 * - `availability` / `inventoryLevel`: flattened from the first offer
 * - `id`: alternative identifier used by some backends
 */
export type AggregatedCatalogItem = Omit<AggregatedCatalogItemBase, 'product'> & {
  product: SchemaOrgProductLite;
  offer?: SchemaOrgOfferLite;
  offers?: SchemaOrgOfferLite[];
  Offers?: SchemaOrgOfferLite[];
  Offer?: SchemaOrgOfferLite;
  availability?: string;
  inventoryLevel?: { value?: number };
  id?: string;
};
