// src/lib/market/catalogClient.ts
import { MARKET_API_BASE, MARKET_OPERATOR } from '$lib/config/market';
import type { AggregatedCatalogItem } from '$lib/market/types';
import { extractProducts } from '$lib/market/catalogHelpers';
import { normalizeAddress } from '$lib/offers/adapters';
import type { Address } from '@circles-sdk/utils';

const OPERATOR: Address = MARKET_OPERATOR;
const API_BASE = MARKET_API_BASE;

function buildCatalogUrl(avatars: Address[]): string {
  const params = avatars
    .map((a) => `avatars=${encodeURIComponent(a.toLowerCase())}`)
    .join('&');
  return `${API_BASE}/api/operator/${OPERATOR}/catalog?${params}`;
}

async function fetchCatalogForAvatars(
  avatars: Address[],
): Promise<AggregatedCatalogItem[]> {
  if (!avatars.length) {
    return [];
  }

  const url = buildCatalogUrl(avatars);
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/ld+json' },
  });

  let body: unknown = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }

  if (!res.ok) {
    throw new Error(
      `Catalog API error ${res.status}${res.statusText ? `: ${res.statusText}` : ''}`,
    );
  }

  const items = extractProducts(body);
  return items;
}

/**
 * Fetch the operator catalog for a fixed set of avatars
 * (used on the main /market page).
 *
 * NOTE: The hard-coded avatar list is taken from the current
 * /market/+page.svelte implementation; adjust as needed.
 */
export async function fetchGlobalCatalog(): Promise<AggregatedCatalogItem[]> {
  const avatars: Address[] = [
    // '0x31d5d15c558fbfbbbe604c9c11eb42c9afbf5140',
    '0x1327c3cf61c6df3e0cf69faa4590281d6f675ce5',
    '0xde374ece6fa50e781e81aac78e811b33d16912c7',
    '0x314278c65545f0f96f8fe0836ad92b3326bfff2e'
  ];
  return fetchCatalogForAvatars(avatars);
}

/**
 * Fetch all catalog items for a given seller address.
 */
export async function fetchSellerCatalog(
  sellerRaw: string,
): Promise<AggregatedCatalogItem[]> {
  const seller = normalizeAddress(sellerRaw);
  return fetchCatalogForAvatars([seller]);
}

/**
 * Fetch a single product for (seller, sku).
 * If multiple entries match, returns the first one.
 */
export async function fetchProductForSellerAndSku(
  sellerRaw: string,
  skuRaw: string,
): Promise<AggregatedCatalogItem | null> {
  const seller = normalizeAddress(sellerRaw);
  const sku = String(skuRaw).toLowerCase();

  const all = await fetchSellerCatalog(seller);
  const fromSeller = all.filter(
    (it) => it.seller.toLowerCase() === seller.toLowerCase(),
  );

  if (!fromSeller.length) {
    return null;
  }

  const bySku =
    fromSeller.find(
      (it) => (it.product?.sku ?? '').toLowerCase() === sku,
    ) ?? null;

  if (bySku) return bySku;

  // Fallback: match by id/productCid if SKU lookup fails.
  const byId =
    fromSeller.find((it: any) => {
      const id = String(it.id ?? '').toLowerCase();
      const cid = String(it.productCid ?? '').toLowerCase();
      return id === sku || cid === sku;
    }) ?? null;

  return byId ?? fromSeller[0] ?? null;
}

// Note: No caching here. If needed, add a simple in-memory Map cache later.
