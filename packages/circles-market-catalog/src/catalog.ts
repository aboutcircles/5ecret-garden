import type { AggregatedCatalog, AggregatedCatalogItem } from './catalogTypes';
import { normalizeEvmAddress } from '@circles-market/core';

export type CatalogQuery = {
  operator: string;
  avatars: string[];
  chainId?: number;
  start?: number;
  end?: number;
  pageSize?: number;
  cursor?: string | null;
  offset?: number;
};

export type CatalogPage = {
  catalog: AggregatedCatalog | null;
  items: AggregatedCatalogItem[];
  nextCursor: string | null;
  nextLink: string | null;
  status: number;
};

export function extractProducts(body: unknown): AggregatedCatalogItem[] {
  const typed = (body as AggregatedCatalog | undefined)?.products;
  if (Array.isArray(typed)) return typed as AggregatedCatalogItem[];

  const anyBody = body as any;
  if (Array.isArray(anyBody?.items)) return anyBody.items as AggregatedCatalogItem[];
  if (Array.isArray(anyBody?.results)) return anyBody.results as AggregatedCatalogItem[];
  if (anyBody?.catalog && Array.isArray(anyBody.catalog.products)) {
    return anyBody.catalog.products as AggregatedCatalogItem[];
  }

  return [];
}

function buildCatalogUrl(marketApiBase: string, q: CatalogQuery): string {
  const operator = normalizeEvmAddress(q.operator);

  const qp = new URLSearchParams();
  // Be defensive: q.avatars may not always be a plain array at runtime.
  const avatarsInput: any = (q as any).avatars;
  if (avatarsInput) {
    const iterable = typeof avatarsInput[Symbol.iterator] === 'function' ? avatarsInput : [avatarsInput];
    for (const a of iterable as any) {
      if (!a) continue;
      qp.append('avatars', normalizeEvmAddress(String(a)));
    }
  }
  if (q.chainId != null) qp.set('chainId', String(q.chainId));
  if (q.start != null) qp.set('start', String(q.start));
  if (q.end != null) qp.set('end', String(q.end));
  if (q.pageSize != null) qp.set('pageSize', String(q.pageSize));
  if (q.cursor) qp.set('cursor', q.cursor);
  if (q.offset != null) qp.set('offset', String(q.offset));

  return `${marketApiBase.replace(/\/$/, '')}/api/operator/${operator}/catalog?${qp.toString()}`;
}

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

export interface OperatorCatalogClient {
  fetchCatalogPage(q: Omit<CatalogQuery, 'operator'>): Promise<CatalogPage>;
  fetchSellerCatalog(
    seller: string,
    opts?: Omit<CatalogQuery, 'operator' | 'avatars'>,
  ): Promise<AggregatedCatalogItem[]>;
  fetchProductForSellerAndSku(
    seller: string,
    sku: string,
    opts?: { chainId?: number; start?: number; end?: number; pageSize?: number; maxPages?: number },
  ): Promise<AggregatedCatalogItem | null>;
}

export interface CatalogClient {
  forOperator(operator: string): OperatorCatalogClient;
  fetchCatalogPage(q: CatalogQuery): Promise<CatalogPage>;
}

class OperatorCatalogClientImpl implements OperatorCatalogClient {
  constructor(
    private readonly base: CatalogClientImpl,
    private readonly operator: string,
  ) {}

  async fetchCatalogPage(q: Omit<CatalogQuery, 'operator'>): Promise<CatalogPage> {
    return await this.base.fetchCatalogPage({ ...q, operator: this.operator });
  }
  async fetchSellerCatalog(
    seller: string,
    opts?: Omit<CatalogQuery, 'operator' | 'avatars'>,
  ): Promise<AggregatedCatalogItem[]> {
    const page = await this.base.fetchCatalogPage({
      operator: this.operator,
      avatars: [seller],
      chainId: opts?.chainId,
      start: opts?.start,
      end: opts?.end,
      pageSize: opts?.pageSize,
      cursor: null,
      offset: opts?.offset,
    });
    return page.items;
  }
  async fetchProductForSellerAndSku(
    seller: string,
    sku: string,
    opts?: { chainId?: number; start?: number; end?: number; pageSize?: number; maxPages?: number },
  ): Promise<AggregatedCatalogItem | null> {
    let cursor: string | null = null;
    let pages = 0;
    const maxPages = opts?.maxPages ?? 10;
    while (pages < maxPages) {
      const page = await this.base.fetchCatalogPage({
        operator: this.operator,
        avatars: [seller],
        chainId: opts?.chainId,
        start: opts?.start,
        end: opts?.end,
        pageSize: opts?.pageSize,
        cursor,
      });
      const found = page.items.find((i) => i.product?.sku === sku);
      if (found) return found;
      if (!page.nextCursor) return null;
      cursor = page.nextCursor;
      pages++;
    }
    return null;
  }
}

export class CatalogClientImpl implements CatalogClient {
  constructor(private readonly marketApiBase: string) {}

  forOperator(operator: string): OperatorCatalogClient {
    return new OperatorCatalogClientImpl(this, operator);
  }

  async fetchCatalogPage(q: CatalogQuery): Promise<CatalogPage> {
    const url = buildCatalogUrl(this.marketApiBase, q);

    const cacheKey = JSON.stringify(['catalog', this.marketApiBase, q]);
    return memoizeCatalogPage(cacheKey, async () => {
      const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/ld+json' } });
      const status = res.status;
      if (status === 416) {
        return { catalog: null, items: [], nextCursor: null, nextLink: null, status } satisfies CatalogPage;
      }

      let body: any = null;
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
      const catalog = (body && typeof body === 'object' && 'catalog' in body ? (body as any).catalog : null) as
        | AggregatedCatalog
        | null;

      // next link discovery (offset pagination or cursor)
      let nextCursor: string | null = null;
      let nextLink: string | null = null;

      const cursorHeader = res.headers.get('X-Next-Cursor') || res.headers.get('x-next-cursor');
      const hasCursorHeader = typeof cursorHeader === 'string' && cursorHeader.trim().length > 0;
      if (hasCursorHeader) {
        nextCursor = cursorHeader.trim();
      }

      const linkHeader = res.headers.get('Link') || res.headers.get('link');
      const hasLinkHeader = typeof linkHeader === 'string' && linkHeader.length > 0;
      if (hasLinkHeader) {
        const m = /<([^>]+)>;\s*rel="next"/i.exec(linkHeader);
        const hasNext = Boolean(m && m[1]);
        if (hasNext) {
          const raw = m![1]!;
          try {
            // server may emit a relative link; resolve against the request URL
            const resolved = new URL(raw, url).toString();
            nextLink = resolved;

            if (!nextCursor) {
              const cc = new URL(resolved).searchParams.get('cursor');
              const hasCc = typeof cc === 'string' && cc.length > 0;
              if (hasCc) {
                nextCursor = cc;
              }
            }
          } catch {
            nextLink = raw;
          }
        }
      }

      return { catalog, items, nextCursor, nextLink, status } satisfies CatalogPage;
    });
  }
}
