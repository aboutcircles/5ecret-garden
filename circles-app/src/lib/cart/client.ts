// src/lib/cart/client.ts
import { MARKET_API_BASE } from '$lib/config/market';
import type { Address } from '@circles-sdk/utils';
import type {
  Basket,
  BasketCreateRequest,
  BasketCreateResponse,
  ValidationResult,
  OrderSnapshot,
} from './types';
import { getAuthToken } from '$lib/auth/siwe';

export type CartClientConfig = {
  apiBase?: string; // defaults to MARKET_API_BASE if not provided
};

function resolveBase(cfg?: CartClientConfig): string {
  const base = cfg?.apiBase ?? MARKET_API_BASE;
  return base.replace(/\/$/, '');
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export class CartHttpError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `Cart API error ${status}`);
    this.name = 'CartHttpError';
    this.status = status;
    this.body = body;
  }
}

/**
 * GET /orders/{orderId} (auth required)
 * Retrieves a full order snapshot for the authenticated owner.
 * Use this in new clients instead of the legacy POST /orders/lookup.
 */
export async function getOrder(
  orderId: string,
  cfg?: CartClientConfig,
): Promise<OrderSnapshot> {
  const base = resolveBase(cfg);
  const token = getAuthToken();
  if (!token) {
    const err = new CartHttpError(401, {}, 'Missing auth token');
    (err as any).authRequired = true;
    throw err;
  }
  const url = `${base}/api/cart/v1/orders/${encodeURIComponent(orderId)}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/ld+json',
      Authorization: `Bearer ${token}`,
    },
  });

  const body = await parseJson<unknown>(res).catch(() => ({}));

  if (res.status === 200) {
    return body as OrderSnapshot;
  }
  if (res.status === 401) {
    throw new CartHttpError(401, body, 'Unauthorized');
  }
  if (res.status === 404) {
    throw new CartHttpError(404, body, 'Order not found');
  }
  throw new CartHttpError(res.status, body);
}

/**
 * Legacy compat: POST /orders/lookup (auth required)
 * Treats provided id as orderId. Prefer getOrder() above and migrate callers.
 */
export async function getOrderViaLookup(
  orderId: string,
  cfg?: CartClientConfig,
): Promise<OrderSnapshot> {
  const base = resolveBase(cfg);
  const token = getAuthToken();
  if (!token) {
    const err = new CartHttpError(401, {}, 'Missing auth token');
    (err as any).authRequired = true;
    throw err;
  }
  const url = `${base}/api/cart/v1/orders/lookup`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/ld+json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ orderId }),
  });

  const body = await parseJson<unknown>(res).catch(() => ({}));

  if (res.status === 200) return body as OrderSnapshot;
  if (res.status === 401) throw new CartHttpError(401, body, 'Unauthorized');
  if (res.status === 404) throw new CartHttpError(404, body, 'Order not found');
  throw new CartHttpError(res.status, body);
}

/**
 * POST /orders/batch (public by ids)
 * Note: This endpoint remains public and must not leak owner-only fields.
 */
export async function getOrdersBatch(
  ids: string[],
  cfg?: CartClientConfig,
): Promise<OrderSnapshot[]> {
  const base = resolveBase(cfg);
  const url = `${base}/api/cart/v1/orders/batch`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/ld+json; charset=utf-8',
      Accept: 'application/ld+json',
    },
    body: JSON.stringify({ ids }),
  });

  const body = await parseJson<any>(res).catch(() => ({}));

  if (res.status === 400) {
    throw new CartHttpError(400, body);
  }

  if (!res.ok) {
    throw new CartHttpError(res.status, body);
  }

  const items = Array.isArray(body?.items) ? (body.items as OrderSnapshot[]) : [];
  return items;
}

/**
 * GET /orders/by-buyer (requires JWT)
 */
export async function getOrdersByBuyer(
  page = 1,
  pageSize = 50,
  cfg?: CartClientConfig,
): Promise<{ items: any[] }> {
  const base = resolveBase(cfg);
  const token = getAuthToken();
  if (!token) {
    const err = new CartHttpError(401, {}, 'Missing auth token');
    (err as any).authRequired = true;
    throw err;
  }

  const url = `${base}/api/cart/v1/orders/by-buyer?page=${encodeURIComponent(String(page))}&pageSize=${encodeURIComponent(String(pageSize))}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/ld+json',
      Authorization: `Bearer ${token}`,
    },
  });

  const body = await parseJson<any>(res).catch(() => ({}));
  if (res.status === 401) throw new CartHttpError(401, body, 'Unauthorized');
  if (!res.ok) throw new CartHttpError(res.status, body);
  const items = Array.isArray(body?.items) ? body.items : [];
  return { items } as { items: any[] };
}

/**
 * POST /baskets – create basket.
 */
export async function createBasket(
  req: BasketCreateRequest,
  cfg?: CartClientConfig,
): Promise<BasketCreateResponse> {
  const base = resolveBase(cfg);
  const url = `${base}/api/cart/v1/baskets`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/ld+json; charset=utf-8',
      Accept: 'application/ld+json',
    },
    body: JSON.stringify(req),
  });

  const raw = await parseJson<any>(res).catch(() => ({} as any));

  if (!res.ok) {
    throw new CartHttpError(res.status, raw);
  }

  // Normalize backend variations: it may return `BasketId` (PascalCase)
  // while the client expects `basketId` (camelCase).
  const rawBasketId =
    typeof raw?.basketId === 'string' && raw.basketId.trim().length > 0
      ? raw.basketId
      : typeof raw?.BasketId === 'string' && raw.BasketId.trim().length > 0
        ? raw.BasketId
        : null;

  if (!rawBasketId) {
    throw new Error(
      'Cart API createBasket did not return a valid basketId/BasketId field. ' +
        'Check the backend implementation of POST /api/cart/v1/baskets.',
    );
  }

  const out: BasketCreateResponse = {
    '@type': raw['@type'] ?? 'circles:Basket',
    basketId: rawBasketId,
  };

  return out;
}

/**
 * GET /baskets/{id}
 */
export async function getBasket(
  basketId: string,
  cfg?: CartClientConfig,
): Promise<Basket> {
  const base = resolveBase(cfg);
  const url = `${base}/api/cart/v1/baskets/${encodeURIComponent(basketId)}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/ld+json' },
  });

  if (!res.ok) {
    const body = await parseJson<unknown>(res).catch(() => ({}));
    throw new CartHttpError(res.status, body);
  }

  return parseJson<Basket>(res);
}

/**
 * PATCH /baskets/{id}
 */
export type BasketPatch = {
  items?: Basket['items'];
  shippingAddress?: Basket['shippingAddress'];
  billingAddress?: Basket['billingAddress'];
  ageProof?: Basket['ageProof'];
  contactPoint?: Basket['contactPoint'];
  ttlSeconds?: number;
};

export async function patchBasket(
  basketId: string,
  patch: BasketPatch,
  cfg?: CartClientConfig,
): Promise<Basket> {
  // Defensive: strip any offerSnapshot fields from outbound items. The server
  // is authoritative and will populate canonical snapshots in responses.
  const safePatch: BasketPatch = {
    ...patch,
    items: Array.isArray(patch.items)
      ? patch.items.map((it: any) => {
          if (it && typeof it === 'object' && 'offerSnapshot' in it) {
            const { offerSnapshot: _drop, ...rest } = it;
            return rest;
          }
          return it;
        })
      : patch.items,
  };
  const base = resolveBase(cfg);
  const url = `${base}/api/cart/v1/baskets/${encodeURIComponent(basketId)}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/ld+json; charset=utf-8',
      Accept: 'application/ld+json',
    },
    body: JSON.stringify(safePatch),
  });

  if (!res.ok) {
    const body = await parseJson<unknown>(res).catch(() => ({}));
    throw new CartHttpError(res.status, body);
  }

  return parseJson<Basket>(res);
}

/**
 * POST /baskets/{id}/validate
 */
export async function validateBasket(
  basketId: string,
  cfg?: CartClientConfig,
): Promise<ValidationResult> {
  const base = resolveBase(cfg);
  const url = `${base}/api/cart/v1/baskets/${encodeURIComponent(
    basketId,
  )}/validate`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/ld+json' },
  });

  const body = await parseJson<unknown>(res).catch(() => ({}));

  if (!res.ok) {
    throw new CartHttpError(res.status, body);
  }

  return body as ValidationResult;
}

/**
 * POST /baskets/{id}/preview
 */
export async function previewOrder(
  basketId: string,
  cfg?: CartClientConfig & { buyerOverride?: Address },
): Promise<OrderSnapshot> {
  const base = resolveBase(cfg);
  const buyerQuery =
    cfg?.buyerOverride != null ? `?buyer=${encodeURIComponent(cfg.buyerOverride)}` : '';
  const url = `${base}/api/cart/v1/baskets/${encodeURIComponent(
    basketId,
  )}/preview${buyerQuery}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/ld+json' },
  });

  const body = await parseJson<unknown>(res).catch(() => ({}));

  if (!res.ok) {
    throw new CartHttpError(res.status, body);
  }

  return body as OrderSnapshot;
}

/**
 * POST /baskets/{id}/checkout
 */
export type CheckoutResponse = {
  orderId: string;
  basketId: string;
  orderCid: string | null;
  paymentReference?: string; // non-secret, public correlation
};

export async function checkoutBasket(
  basketId: string,
  cfg?: CartClientConfig & { buyerOverride?: Address },
): Promise<CheckoutResponse> {
  const base = resolveBase(cfg);
  const buyerQuery =
    cfg?.buyerOverride != null ? `?buyer=${encodeURIComponent(cfg.buyerOverride)}` : '';
  const url = `${base}/api/cart/v1/baskets/${encodeURIComponent(
    basketId,
  )}/checkout${buyerQuery}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/ld+json; charset=utf-8',
    },
  });

  const body = await parseJson<unknown>(res).catch(() => ({}));

  if (!res.ok) {
    throw new CartHttpError(res.status, body);
  }

  return body as CheckoutResponse;
}
