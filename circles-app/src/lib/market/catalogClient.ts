// src/lib/market/catalogClient.ts
import { MARKET_API_BASE, MARKET_OPERATOR } from '$lib/config/market';
import type { AggregatedCatalog, AggregatedCatalogItem } from '$lib/market/types';
import { extractProducts } from '$lib/market/catalogHelpers';
import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
import type { Address } from '@circles-sdk/utils';

const OPERATOR: Address = MARKET_OPERATOR;
const API_BASE = MARKET_API_BASE;

export type CatalogQuery = {
  avatars: Address[];
  chainId?: number;
  start?: number;
  end?: number;
  pageSize?: number;
  cursor?: string | null;
  offset?: number;
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
  catalog: AggregatedCatalog | null;
  items: AggregatedCatalogItem[];
  nextCursor: string | null;
  nextLink: string | null;
  status: number;
};

type CacheEntry<T> = { exp: number; promise: Promise<T> };
const PAGE_CACHE_TTL_MS = 10_000;
const PAGE_CACHE_MAX = 200;
const pageCache = new Map<string, CacheEntry<CatalogPage>>();

function prunePageCache(): void {
  const now = Date.now();
  for (const [k, v] of pageCache) {
    if (v.exp <= now) pageCache.delete(k);
  }
  while (pageCache.size > PAGE_CACHE_MAX) {
    const firstKey = pageCache.keys().next().value as string | undefined;
    if (!firstKey) break;
    pageCache.delete(firstKey);
  }
}

function memoizeCatalogPage(key: string, fn: () => Promise<CatalogPage>): Promise<CatalogPage> {
  const now = Date.now();
  const existing = pageCache.get(key);
  if (existing && existing.exp > now) return existing.promise;

  prunePageCache();

  const p = fn();
  pageCache.set(key, { exp: now + PAGE_CACHE_TTL_MS, promise: p });

  p.catch(() => {
    const cur = pageCache.get(key);
    if (cur?.promise === p) pageCache.delete(key);
  });

  return p;
}

export async function fetchCatalogPage(q: CatalogQuery): Promise<CatalogPage> {
  if (!q.avatars?.length) {
    throw new Error('At least one avatars value is required');
  }

  const url = buildCatalogUrl(q);

  return memoizeCatalogPage(url, async () => {
    const res = await fetch(url, { headers: { Accept: 'application/ld+json' } });

    if (res.status === 416) {
      return { catalog: null, items: [], nextCursor: null, nextLink: null, status: 416 };
    }

    let body: unknown = {};
    try {
      body = await res.json();
    } catch {
      body = {};
    }

    if (!res.ok) {
      const msg = (body as any)?.error ?? res.statusText ?? 'Request failed';
      throw new Error(`Catalog API error ${res.status}: ${msg}`);
    }

    const items = extractProducts(body);
    const nextCursor = res.headers.get('X-Next-Cursor');

    const link = res.headers.get('Link');
    const nextLink =
      link && /<([^>]+)>;\s*rel="next"/i.test(link)
        ? (link.match(/<([^>]+)>;\s*rel="next"/i)?.[1] ?? null)
        : null;

    return {
      catalog: body as AggregatedCatalog,
      items,
      nextCursor,
      nextLink,
      status: res.status,
    };
  });
}

export async function fetchSellerCatalog(
  sellerRaw: string,
  opts?: Omit<CatalogQuery, 'avatars'>,
): Promise<AggregatedCatalogItem[]> {
  const seller = normalizeAddress(sellerRaw) as Address;
  const page = await fetchCatalogPage({
    avatars: [seller],
    pageSize: opts?.pageSize ?? 100,
    chainId: opts?.chainId ?? 100,
    start: opts?.start,
    end: opts?.end,
    cursor: opts?.cursor ?? null,
    offset: opts?.offset,
  });
  return page.items;
}

export async function fetchProductForSellerAndSku(
  sellerRaw: string,
  skuRaw: string,
  opts?: { chainId?: number; start?: number; end?: number; pageSize?: number; maxPages?: number },
): Promise<AggregatedCatalogItem | null> {
  const seller = normalizeAddress(sellerRaw) as Address;
  const sku = String(skuRaw).toLowerCase();

  const chainId = opts?.chainId ?? 100;
  const pageSize = opts?.pageSize ?? 100;
  const maxPages = opts?.maxPages ?? 10;

  let cursor: string | null = null;

  for (let pageNo = 0; pageNo < maxPages; pageNo++) {
    const page = await fetchCatalogPage({
      avatars: [seller],
      chainId,
      start: opts?.start,
      end: opts?.end,
      pageSize,
      cursor,
    });

    if (page.status === 416) {
      return null;
    }

    const bySku =
      page.items.find((it) => (it.product?.sku ?? '').toLowerCase() === sku) ?? null;

    if (bySku) {
      return bySku;
    }

    const byId =
      page.items.find((it: any) => {
        const id = String(it.id ?? '').toLowerCase();
        const cid = String(it.productCid ?? '').toLowerCase();
        return id === sku || cid === sku;
      }) ?? null;

    if (byId) {
      return byId;
    }

    cursor = page.nextCursor;
    if (!cursor) {
      return null;
    }
  }

  return null;
}
