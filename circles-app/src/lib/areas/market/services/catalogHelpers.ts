// src/lib/market/catalogHelpers.ts
// Centralised helpers for working with catalog API responses and products/offers.

import type { AggregatedCatalogItem, SchemaOrgProductLite, SchemaOrgOfferLite } from '$lib/areas/market/model';
import { normalizeProductImagesFromSchema } from '$lib/areas/market/services';

/**
 * Returns the Schema.org-like product object from an AggregatedCatalogItem.
 */
export function getProduct(item: AggregatedCatalogItem): SchemaOrgProductLite {
  return item.product as SchemaOrgProductLite;
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
  const imgs = normalizeProductImagesFromSchema(prod);
  return imgs[0] ?? null;
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

// --- PayAction helpers ---
export type ResolvedPayTo = {
  chainId: number | null;
  address: string | null; // lowercased
  price: number | null;
  priceCurrency: string | null;
  source: 'action' | 'offer' | 'none';
};

function pickFirstPayAction(pa: any): any | null {
  if (!pa) return null;
  if (Array.isArray(pa)) return pa.find((x) => x?.['@type'] === 'PayAction') ?? pa[0] ?? null;
  if (pa?.['@type'] === 'PayAction') return pa;
  return null;
}

export function resolvePayTo(offer: any): ResolvedPayTo {
  // In some catalogs, potentialAction can sit on the offer or the nested item/product
  const action =
    pickFirstPayAction(offer?.potentialAction) ??
    pickFirstPayAction(offer?.itemOffered?.potentialAction) ??
    null;

  const parseEip155 = (idOrValue: string | undefined): { chainId: number | null; address: string | null } => {
    if (!idOrValue) return { chainId: null, address: null };
    const trimmed = String(idOrValue).trim();
    // Accept bare addresses too (assume chain null)
    if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
      return { chainId: null, address: trimmed.toLowerCase() };
    }
    const raw = trimmed.startsWith('eip155:') ? trimmed.slice('eip155:'.length) : trimmed;
    const [chain, addr] = raw.split(':');
    const chainId = chain ? Number(chain) : NaN;
    if (!addr || !chain || Number.isNaN(chainId)) return { chainId: null, address: null };
    return { chainId, address: addr.toLowerCase() };
  };

  let chainId: number | null = null;
  let address: string | null = null;

  // Prefer explicit recipient on PayAction
  const rec: any = action?.recipient;
  if (rec) {
    // Common shapes: {"@id":"eip155:100:0x..."} | {id:"eip155:..."} | {identifier:"eip155:..."} | "eip155:..." | "0x..."
    const idStr =
      (typeof rec === 'string' ? rec : null) ??
      (rec?.['@id'] ?? null) ??
      (rec?.id ?? null) ??
      (rec?.identifier ?? null);
    if (typeof idStr === 'string') {
      const parsed = parseEip155(idStr);
      chainId = parsed.chainId;
      address = parsed.address;
    } else if (typeof rec?.address === 'string') {
      // Fallback if recipient has direct address field
      const addr = rec.address.trim();
      if (/^0x[0-9a-fA-F]{40}$/.test(addr)) {
        chainId = chainId ?? null;
        address = addr.toLowerCase();
      }
    }
  }

  // Fallback to instrument carrying eip155 destination
  if ((!chainId || !address) && action?.instrument?.propertyID === 'eip155') {
    const parsed = parseEip155(String(action.instrument.value ?? ''));
    chainId = chainId ?? parsed.chainId;
    address = address ?? parsed.address;
  }

  const price =
    typeof action?.price === 'number'
      ? action.price
      : typeof offer?.price === 'number'
      ? offer.price
      : null;

  const priceCurrency =
    typeof action?.priceCurrency === 'string'
      ? action.priceCurrency
      : typeof offer?.priceCurrency === 'string'
      ? offer.priceCurrency
      : null;

  const source: ResolvedPayTo['source'] = action ? 'action' : offer ? 'offer' : 'none';

  return { chainId, address, price, priceCurrency, source };
}
