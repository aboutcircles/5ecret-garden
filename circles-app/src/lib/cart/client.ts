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
import { getMarketClient } from '$lib/sdk/marketClient';

function getAuthToken(): string | null {
  try {
    return getMarketClient().authContext.getToken();
  } catch {
    return null;
  }
}

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

// --- Order status DTOs (client-side) ---
// Reused for both history rows and live SSE events. Some fields are optional
// in history results and populated in SSE.
export type OrderStatusEvent = {
  orderId?: string; // present in SSE events
  paymentReference?: string | null; // present in SSE events
  oldStatus?: string | null;
  newStatus: string;
  changedAt: string; // ISO 8601
};

export type OrderStatusHistory = {
  orderId: string;
  events: OrderStatusEvent[];
};

/**
 * GET /orders/{orderId}/status-history (auth required)
 * Returns the timeline of status changes for an order owned by the buyer.
 */
export async function getOrderStatusHistory(
  orderId: string,
  cfg?: CartClientConfig,
): Promise<OrderStatusHistory> {
  const base = resolveBase(cfg);
  const token = getAuthToken();
  if (!token) {
    const err = new CartHttpError(401, {}, 'Missing auth token');
    (err as any).authRequired = true;
    throw err;
  }

  const url = `${base}/api/cart/v1/orders/${encodeURIComponent(orderId)}/status-history`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/ld+json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 404) {
    // Unknown order or not owned by this buyer — surface empty timeline gracefully.
    return { orderId, events: [] };
  }

  const body = await parseJson<any>(res).catch(() => ({}));

  if (!res.ok) {
    throw new CartHttpError(res.status, body, 'getOrderStatusHistory failed');
  }

  const events = Array.isArray(body?.events) ? (body.events as OrderStatusEvent[]) : [];
  return {
    orderId: String(body?.orderId ?? orderId),
    events,
  };
}

// --- Live SSE: buyer-scoped order status events ---
export function subscribeOrderEvents(
  apiBase: string,
  token: string,
  onEvent: (e: OrderStatusEvent) => void,
  opts?: { reconnect?: boolean; minDelayMs?: number; maxDelayMs?: number },
): () => void {
  const base = apiBase.replace(/\/$/, '');
  const reconnect = opts?.reconnect ?? true;
  const minDelay = Math.max(250, opts?.minDelayMs ?? 1000);
  const maxDelay = Math.max(minDelay, opts?.maxDelayMs ?? 15000);

  let aborted = false;
  let controller: AbortController | null = null;
  let retryDelay = minDelay;

  const connect = async () => {
    if (aborted) return;
    try {
      controller = new AbortController();
      const res = await fetch(`${base}/api/cart/v1/orders/events`, {
        headers: {
          Accept: 'text/event-stream',
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        if (!aborted && reconnect) scheduleReconnect();
        return;
      }

      // Reset delay after successful HTTP setup
      retryDelay = minDelay;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (!aborted) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const chunk = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          handleSseChunk(chunk, onEvent);
        }
      }

      if (!aborted && reconnect) scheduleReconnect();
    } catch (_) {
      if (!aborted && reconnect) scheduleReconnect();
    }
  };

  const scheduleReconnect = () => {
    const delay = retryDelay;
    retryDelay = Math.min(maxDelay, Math.floor(retryDelay * 1.7));
    setTimeout(() => { if (!aborted) connect(); }, delay);
  };

  const handleSseChunk = (chunk: string, cb: (e: OrderStatusEvent) => void) => {
    const lines = chunk.split('\n');
    let eventType: string | null = null;
    const dataLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith('event:')) eventType = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    if (eventType !== 'order-status' || dataLines.length === 0) return;
    try {
      const obj = JSON.parse(dataLines.join('\n')) as OrderStatusEvent;
      cb(obj);
    } catch {
      // ignore
    }
  };

  connect();

  return () => {
    aborted = true;
    try { controller?.abort(); } catch {}
  };
}

// --- Buyer-scoped SSE hub (singleton connection, multiple subscribers) ---
let __buyerSseStop: (() => void) | null = null;
const __buyerSseSubs = new Set<(e: OrderStatusEvent) => void>();
let __buyerSseBase: string | null = null;

function __ensureBuyerSse(cfg?: CartClientConfig) {
  if (__buyerSseStop) return;
  const token = getAuthToken();
  if (!token) return;
  const base = resolveBase(cfg);
  __buyerSseBase = base;
  __buyerSseStop = subscribeOrderEvents(base, token, (evt) => {
    for (const fn of Array.from(__buyerSseSubs)) {
      try { fn(evt); } catch {}
    }
  });
}

export function subscribeBuyerOrderEvents(
  onEvent: (e: OrderStatusEvent) => void,
  cfg?: CartClientConfig,
): (() => void) | null {
  const token = getAuthToken();
  if (!token) return null;
  __buyerSseSubs.add(onEvent);
  __ensureBuyerSse(cfg);
  return () => {
    __buyerSseSubs.delete(onEvent);
    if (__buyerSseSubs.size === 0 && __buyerSseStop) {
      try { __buyerSseStop(); } catch {}
      __buyerSseStop = null;
      __buyerSseBase = null;
    }
  };
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
  // Delegate to SDK cart.createBasket
  const { getMarketClient } = await import('$lib/sdk/marketClient');
  const client = getMarketClient();
  const res = await client.cart.createBasket({
    buyer: String(req.buyer ?? ''),
    operator: String(req.operator ?? ''),
    chainId: typeof req.chainId === 'number' ? req.chainId : undefined,
  });
  return { '@type': 'circles:Basket', basketId: res.basketId };
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
  // Delegate to SDK cart methods while preserving semantics.
  const { getMarketClient } = await import('$lib/sdk/marketClient');
  const client = getMarketClient();

  let result: Basket | null = null;

  // Apply items if provided
  if (Array.isArray(patch.items)) {
    // Map to SDK BasketItemInput[]
    const items = patch.items.map((it: any) => ({
      seller: it?.seller ?? undefined,
      sku: it?.orderedItem?.sku,
      quantity: it?.orderQuantity,
      imageUrl: it?.imageUrl,
    }));
    result = await client.cart.setItems({ basketId, items });
  }

  // Apply checkout details if provided
  if (
    patch.shippingAddress !== undefined ||
    patch.billingAddress !== undefined ||
    patch.contactPoint !== undefined ||
    patch.ageProof !== undefined
  ) {
    result = await client.cart.setCheckoutDetails({
      basketId,
      shippingAddress: patch.shippingAddress ?? undefined,
      billingAddress: patch.billingAddress ?? undefined,
      contactPoint: patch.contactPoint ?? undefined,
      ageProof: patch.ageProof ?? undefined,
    });
  }

  // TTL currently not supported via SDK; fallback to HTTP if only ttlSeconds is being updated
  if (!result && typeof patch.ttlSeconds === 'number') {
    const base = resolveBase(cfg);
    const url = `${base}/api/cart/v1/baskets/${encodeURIComponent(basketId)}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/ld+json; charset=utf-8',
        Accept: 'application/ld+json',
      },
      body: JSON.stringify({ ttlSeconds: patch.ttlSeconds }),
    });
    if (!res.ok) {
      const body = await parseJson<unknown>(res).catch(() => ({}));
      throw new CartHttpError(res.status, body);
    }
    return parseJson<Basket>(res);
  }

  // If neither items nor details changed, just return current basket
  if (!result) {
    return await getBasket(basketId, cfg);
  }
  return result;
}

/**
 * POST /baskets/{id}/validate
 */
export async function validateBasket(
  basketId: string,
  cfg?: CartClientConfig,
): Promise<ValidationResult> {
  const { getMarketClient } = await import('$lib/sdk/marketClient');
  const client = getMarketClient();
  return await client.cart.validateBasket(basketId);
}

/**
 * POST /baskets/{id}/preview
 */
export async function previewOrder(
  basketId: string,
  cfg?: CartClientConfig & { buyerOverride?: Address },
): Promise<OrderSnapshot> {
  // If a buyerOverride is provided, fall back to HTTP preview to preserve legacy behavior.
  if (cfg?.buyerOverride) {
    const base = resolveBase(cfg);
    const url = `${base}/api/cart/v1/baskets/${encodeURIComponent(basketId)}/preview?buyer=${encodeURIComponent(
      cfg.buyerOverride,
    )}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/ld+json' },
    });
    const body = await parseJson<unknown>(res).catch(() => ({}));
    if (!res.ok) throw new CartHttpError(res.status, body);
    return body as OrderSnapshot;
  }
  // Otherwise use SDK
  const { getMarketClient } = await import('$lib/sdk/marketClient');
  const client = getMarketClient();
  return (await client.cart.previewOrder(basketId)) as OrderSnapshot;
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
  const { getMarketClient } = await import('$lib/sdk/marketClient');
  const client = getMarketClient();
  const resp = await client.cart.checkoutBasket({
    basketId,
    buyer: cfg?.buyerOverride ? String(cfg.buyerOverride) : undefined,
  });
  return {
    orderId: resp.orderId,
    basketId: resp.basketId,
    orderCid: null,
    paymentReference: resp.paymentReference,
  };
}
