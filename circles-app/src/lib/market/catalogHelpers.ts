// src/lib/market/catalogHelpers.ts
// Centralised helpers for working with catalog API responses and products/offers.

import type { AggregatedCatalog, AggregatedCatalogItem, SchemaOrgProductLite, SchemaOrgOfferLite } from '$lib/market/types';

/**
 * Extracts the array of catalog items from a variety of possible API response shapes.
 */
export function extractProducts(body: unknown): AggregatedCatalogItem[] {
  const typed = (body as AggregatedCatalog | undefined)?.products;
  if (Array.isArray(typed)) return typed as AggregatedCatalogItem[];
  const anyBody = body as any;
  if (Array.isArray(anyBody?.items)) return anyBody.items as AggregatedCatalogItem[];
  if (Array.isArray(anyBody?.results)) return anyBody.results as AggregatedCatalogItem[];
  if (anyBody?.catalog && Array.isArray(anyBody.catalog.products)) {
    return anyBody.catalog.products as AggregatedCatalogItem[];
  }
  return [] as AggregatedCatalogItem[];
}

/**
 * Returns the Schema.org-like product object from an AggregatedCatalogItem.
 */
export function getProduct(item: AggregatedCatalogItem): SchemaOrgProductLite {
  return (item as any).product as SchemaOrgProductLite;
}

/**
 * Returns the first offer object from the product-like entity if present.
 */
export function getFirstOffer(prod: any): SchemaOrgOfferLite | null {
  const o = prod?.offers ?? prod?.offer ?? prod?.Offers ?? prod?.Offer;
  if (!o) return null as any;
  if (Array.isArray(o)) return (o[0] ?? null) as any;
  if (typeof o === 'object') return o as any;
  return null as any;
}

/**
 * Picks a representative image URL from a product-like object.
 * Accepts various shapes: string, array of strings/objects with url fields, or contentUrl-like nests.
 */
export function pickProductImageUrl(prod: any): string | null {
  if (!prod) return null;
  const imgs = (prod as any)?.image ?? (prod as any)?.images;
  if (typeof imgs === 'string') return imgs;
  if (Array.isArray(imgs)) {
    for (const it of imgs) {
      if (!it) continue;
      if (typeof it === 'string') return it;
      if (typeof (it as any)?.url === 'string') return (it as any).url;
      if (typeof (it as any)?.Url === 'string') return (it as any).Url;
      if (typeof (it as any)?.object?.contentUrl === 'string') return (it as any).object.contentUrl;
      if (typeof (it as any)?.Object?.ContentUrl === 'string') return (it as any).Object.ContentUrl;
    }
  }
  if (typeof (prod as any)?.imageUrl === 'string') return (prod as any).imageUrl;
  if (typeof (prod as any)?.ImageUrl === 'string') return (prod as any).ImageUrl;
  return null;
}

/**
 * Checks if a catalog item is owned by the given owner address (case-insensitive).
 */
export function isProductOwnedBy(
  item: AggregatedCatalogItem,
  owner: string | null | undefined,
): boolean {
  const seller = ((item as any).seller ?? '').toLowerCase();
  const o = (owner ?? '').toLowerCase();
  return !!seller && !!o && seller === o;
}
