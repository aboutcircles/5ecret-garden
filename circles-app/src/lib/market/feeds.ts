// src/lib/market/feeds.ts
// Lightweight client-side resolvers for availability/inventory feeds (display-only).

import { isAbsoluteUri } from '@circles-market/sdk';

export type QuantitativeValue = {
  '@type': 'QuantitativeValue';
  value: number;
  unitCode?: string;
};

type CacheEntry<T> = { exp: number; data: T | null };
const cache = new Map<string, CacheEntry<any>>();

// Tunables (can be configured at runtime)
let DEFAULT_TIMEOUT_MS = 3000;
let DEFAULT_TTL_MS = 60_000;

export function configureFeedDefaults(opts: { timeoutMs?: number; ttlMs?: number }): void {
  if (typeof opts.timeoutMs === 'number' && opts.timeoutMs > 0) DEFAULT_TIMEOUT_MS = opts.timeoutMs;
  if (typeof opts.ttlMs === 'number' && opts.ttlMs > 0) DEFAULT_TTL_MS = opts.ttlMs;
}

async function fetchJson(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<any | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    try {
      return await res.json();
    } catch {
      return null;
    }
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function fetchAvailabilityFeed(uri: string, ttlMs = DEFAULT_TTL_MS): Promise<string | null> {
  if (!isAbsoluteUri(uri)) return null;
  const now = Date.now();
  const c = cache.get(uri);
  if (c && c.exp > now) return c.data ?? null;
  // For now support http(s) only; other schemes can be added later.
  if (!/^https?:\/\//i.test(uri)) {
    cache.set(uri, { exp: now + ttlMs, data: null });
    return null;
  }
  const body = await fetchJson(uri);
  const iri = typeof body === 'string' ? body : null;
  cache.set(uri, { exp: now + ttlMs, data: iri });
  return iri;
}

export async function fetchInventoryFeed(uri: string, ttlMs = DEFAULT_TTL_MS): Promise<QuantitativeValue | null> {
  if (!isAbsoluteUri(uri)) return null;
  const now = Date.now();
  const c = cache.get(uri);
  if (c && c.exp > now) return c.data ?? null;
  if (!/^https?:\/\//i.test(uri)) {
    cache.set(uri, { exp: now + ttlMs, data: null });
    return null;
  }
  const body = await fetchJson(uri);
  const ok = !!body && body['@type'] === 'QuantitativeValue' && Number.isInteger(body.value) && body.value >= 0;
  const qv: QuantitativeValue | null = ok ? { '@type': 'QuantitativeValue', value: body.value, unitCode: body.unitCode } : null;
  cache.set(uri, { exp: now + ttlMs, data: qv });
  return qv;
}

export function mapAvailabilityToLabel(iri: string | null | undefined): { label: string; tone: 'success' | 'warning' | 'neutral' } | null {
  if (!iri) return null;
  if (iri.endsWith('/InStock')) return { label: 'In stock', tone: 'success' };
  if (iri.endsWith('/OutOfStock')) return { label: 'Out of stock', tone: 'neutral' };
  if (iri.endsWith('/LimitedAvailability')) return { label: 'Limited', tone: 'warning' };
  if (iri.endsWith('/PreOrder')) return { label: 'Pre-order', tone: 'warning' };
  if (iri.endsWith('/BackOrder')) return { label: 'Back-order', tone: 'warning' };
  return { label: 'Available', tone: 'neutral' };
}
