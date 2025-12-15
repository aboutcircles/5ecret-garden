import { HttpError, type HttpTransport } from '@circles-market/core';
import type { AuthContext } from '@circles-market/session';
import type { OrderSnapshot, OrderStatusEventPayload, OrderStatusHistory } from './ordersTypes';

/**
 * High-level client for buyer-scoped order operations.
 *
 * Wraps the Market API `/api/cart/v1/orders/...` endpoints:
 * - GET `/orders/by-buyer` → {@link OrdersClient.list}
 * - GET `/orders/{orderId}` → {@link OrdersClient.getById}
 * - GET `/orders/{orderId}/status-history` → {@link OrdersClient.getStatusHistory}
 * - GET `/orders/events` (SSE) → {@link OrdersClient.subscribeStatusEvents}
 *
 * Requires a valid JWT to be present in the {@link AuthContext}.
 */
export interface OrdersClient {
  /**
   * List orders for the currently authenticated buyer.
   * @param opts Optional pagination settings. Defaults to page=1, pageSize=50.
   * @returns Array of {@link OrderSnapshot} objects, newest first.
   */
  list(opts?: { page?: number; pageSize?: number }): Promise<OrderSnapshot[]>;
  /** Fetch an order by its identifier. Returns null if not found. */
  getById(orderId: string): Promise<OrderSnapshot | null>;
  /** Retrieve the status history (timeline) for an order. */
  getStatusHistory(orderId: string): Promise<OrderStatusHistory>;
  /**
   * Subscribe to order status events (SSE). Returns an unsubscribe function.
   * Note: this client does not auto-reconnect; consumers may re-subscribe on error.
   */
  subscribeStatusEvents(onEvent: (evt: OrderStatusEventPayload) => void): () => void;
  /** Convenience: triggers handler when an order is delivered or payment completes. */
  onOrderDelivered(handler: (order: OrderSnapshot) => void): () => void;
  /** Batch lookup by order ids (requires auth). */
  getOrdersBatch(ids: string[]): Promise<OrderSnapshot[]>;
}

export class OrdersClientImpl implements OrdersClient {
  constructor(
    private readonly marketApiBase: string,
    private readonly http: HttpTransport,
    private readonly authContext: AuthContext,
  ) {}

  async getOrdersBatch(ids: string[]): Promise<OrderSnapshot[]> {
    const token = this.requireToken();
    const res = await this.http.request<{ items: OrderSnapshot[] }>({
      method: 'POST',
      url: `${this.marketApiBase}/api/cart/v1/orders/batch`,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/ld+json; charset=utf-8',
        Accept: 'application/ld+json',
      },
      body: { ids },
    });
    return Array.isArray(res.items) ? res.items : [];
  }

  async list(opts?: { page?: number; pageSize?: number }): Promise<OrderSnapshot[]> {
    const token = this.requireToken();
    const params = new URLSearchParams();
    if (opts?.page !== undefined) params.set('page', String(opts.page));
    if (opts?.pageSize !== undefined) params.set('pageSize', String(opts.pageSize));

    const res = await this.http.request<{ items: OrderSnapshot[] }>({
      method: 'GET',
      url: `${this.marketApiBase}/api/cart/v1/orders/by-buyer?${params.toString()}`,
      headers: { Authorization: `Bearer ${token}` },
    });

    return Array.isArray(res.items) ? res.items : [];
  }

  async getById(orderId: string): Promise<OrderSnapshot | null> {
    const token = this.requireToken();
    try {
      return await this.http.request<OrderSnapshot>({
        method: 'GET',
        url: `${this.marketApiBase}/api/cart/v1/orders/${encodeURIComponent(orderId)}`,
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e: any) {
      if (e instanceof HttpError && e.status === 404) {
        return null;
      }
      throw e;
    }
  }

  async getStatusHistory(orderId: string): Promise<OrderStatusHistory> {
    const token = this.requireToken();
    return await this.http.request<OrderStatusHistory>({
      method: 'GET',
      url: `${this.marketApiBase}/api/cart/v1/orders/${encodeURIComponent(orderId)}/status-history`,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  subscribeStatusEvents(onEvent: (evt: OrderStatusEventPayload) => void): () => void {
    const token = this.requireToken();
    const controller = new AbortController();
    const url = `${this.marketApiBase}/api/cart/v1/orders/events`;

    // Use native fetch for SSE
    fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok || !res.body) throw new Error(`SSE failed: ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        // Basic SSE parser: split by double newlines
        while (true) {
          if (controller.signal.aborted) break;
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = buffer.indexOf('\n\n')) >= 0) {
            const chunk = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const evt = parseSseEvent(chunk);
            if (evt && (evt.event === 'order-status' || evt.event === undefined)) {
              try {
                const data = JSON.parse(evt.data || '{}');
                onEvent(data as OrderStatusEventPayload);
              } catch {
                // ignore malformed JSON
              }
            }
          }
        }
      })
      .catch(() => {
        // swallow errors; consumers can resubscribe
      });

    return () => controller.abort();
  }

  onOrderDelivered(handler: (order: OrderSnapshot) => void): () => void {
    const ORDER_DELIVERED = 'https://schema.org/OrderDelivered';
    const PAYMENT_COMPLETE = 'https://schema.org/PaymentComplete';
    return this.subscribeStatusEvents(async (evt) => {
      const interesting = evt.newStatus === ORDER_DELIVERED || evt.newStatus === PAYMENT_COMPLETE;
      if (!interesting) return;
      const snap = await this.getById(evt.orderId);
      if (snap) handler(snap);
    });
  }

  private requireToken(): string {
    const token = this.authContext.getToken();
    if (!token) throw new Error('Not authenticated');
    return token;
  }
}

function parseSseEvent(chunk: string): { event?: string; data?: string } | null {
  const lines = chunk.split(/\r?\n/);
  let event: string | undefined;
  const dataParts: string[] = [];
  for (const line of lines) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataParts.push(line.slice(5).trim());
  }
  if (dataParts.length === 0 && !event) return null;
  return { event, data: dataParts.join('\n') };
}
