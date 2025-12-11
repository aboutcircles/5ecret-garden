// src/lib/market/catalogClient.ts
import { MARKET_API_BASE, MARKET_OPERATOR } from '$lib/config/market';
import type { AggregatedCatalog, AggregatedCatalogItem } from '$lib/market/types';
import { extractProducts } from '$lib/market/catalogHelpers';
import { normalizeAddress } from '$lib/offers/adapters';
import type { Address } from '@circles-sdk/utils';

const OPERATOR: Address = MARKET_OPERATOR;
const API_BASE = MARKET_API_BASE;

export type CatalogQuery = {
  avatars: Address[];              // required: one or more
  chainId?: number;                // defaults to 100 on server
  start?: number;                  // unix seconds
  end?: number;                    // unix seconds
  pageSize?: number;               // 1..100 (server clamps)
  cursor?: string | null;          // from X-Next-Cursor
  offset?: number;                 // optional if you want offset mode
};

function buildCatalogUrl(q: CatalogQuery): string {
  const qp = new URLSearchParams();
  q.avatars.forEach((a) => qp.append('avatars', a.toLowerCase()));
  if (q.chainId != null) qp.set('chainId', String(q.chainId));
  if (q.start != null) qp.set('start', String(q.start));
  if (q.end != null) qp.set('end', String(q.end));
  if (q.pageSize != null) qp.set('pageSize', String(q.pageSize));
  if (q.cursor) qp.set('cursor', q.cursor);
  if (q.offset != null) qp.set('offset', String(q.offset));
  return `${API_BASE}/api/operator/${OPERATOR}/catalog?${qp.toString()}`;
}

export type CatalogPage = {
  catalog: AggregatedCatalog | null;      // full payload (optional to use)
  items: AggregatedCatalogItem[];         // current page products
  nextCursor: string | null;              // cursor for the next page
  nextLink: string | null;                // Link rel="next" (if you want)
  status: number;                         // response status
};

export async function fetchCatalogPage(q: CatalogQuery): Promise<CatalogPage> {
  if (!q.avatars?.length) {
    throw new Error('At least one avatars value is required');
  }

  const url = buildCatalogUrl(q);
  const res = await fetch(url, { headers: { Accept: 'application/ld+json' } });

  if (res.status === 416) {
    // Past end: no more items
    return { catalog: null, items: [], nextCursor: null, nextLink: null, status: 416 };
  }

  let body: unknown = {};
  try {
    body = await res.json();
  } catch {/* keep empty */}

  if (!res.ok) {
    // Surface the server error (e.g., 400/413/502)
    const msg = (body as any)?.error ?? res.statusText ?? 'Request failed';
    throw new Error(`Catalog API error ${res.status}: ${msg}`);
  }

  const items = extractProducts(body);
  const nextCursor = res.headers.get('X-Next-Cursor');

  // Optionally read Link: <...>; rel="next"
  const link = res.headers.get('Link');
  const nextLink = link && /<([^>]+)>;\s*rel="next"/i.test(link)
    ? (link.match(/<([^>]+)>;\s*rel="next"/i)?.[1] ?? null)
    : null;

  return {
    catalog: body as AggregatedCatalog,
    items,
    nextCursor,
    nextLink,
    status: res.status,
  };
}

export async function* listCatalogAllPages(q: Omit<CatalogQuery, 'cursor' | 'offset'>) {
  let cursor: string | null = null;
  do {
    const page = await fetchCatalogPage({ ...q, cursor });
    if (page.status === 416) return; // stop if past end
    yield page;
    cursor = page.nextCursor;
  } while (cursor);
}

/**
 * Fetch the operator catalog for a fixed set of avatars
 * (used on the main /market page). Returns first page only.
 */
export async function fetchGlobalCatalog(opts?: Omit<CatalogQuery, 'avatars'>): Promise<AggregatedCatalogItem[]> {
  const avatars: Address[] = [
    '0x1327c3cf61c6df3e0cf69faa4590281d6f675ce5',
    '0xde374ece6fa50e781e81aac78e811b33d16912c7',
    '0x314278c65545f0f96f8fe0836ad92b3326bfff2e'
  ];
  const page = await fetchCatalogPage({ avatars, pageSize: opts?.pageSize ?? 20, chainId: opts?.chainId ?? 100, start: opts?.start, end: opts?.end });
  return page.items;
}

/**
 * Fetch catalog items for a given seller address (first page only).
 */
export async function fetchSellerCatalog(
  sellerRaw: string,
  opts?: Omit<CatalogQuery, 'avatars'>,
): Promise<AggregatedCatalogItem[]> {
  const seller = normalizeAddress(sellerRaw);
  const page = await fetchCatalogPage({ avatars: [seller], pageSize: opts?.pageSize ?? 20, chainId: opts?.chainId ?? 100, start: opts?.start, end: opts?.end });
  return page.items;
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
