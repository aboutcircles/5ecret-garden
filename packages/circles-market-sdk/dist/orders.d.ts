import { type HttpTransport } from './http';
import type { AuthContext } from './authContext';
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
    list(opts?: {
        page?: number;
        pageSize?: number;
    }): Promise<OrderSnapshot[]>;
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
}
export declare class OrdersClientImpl implements OrdersClient {
    private readonly marketApiBase;
    private readonly http;
    private readonly authContext;
    constructor(marketApiBase: string, http: HttpTransport, authContext: AuthContext);
    list(opts?: {
        page?: number;
        pageSize?: number;
    }): Promise<OrderSnapshot[]>;
    getById(orderId: string): Promise<OrderSnapshot | null>;
    getStatusHistory(orderId: string): Promise<OrderStatusHistory>;
    subscribeStatusEvents(onEvent: (evt: OrderStatusEventPayload) => void): () => void;
    onOrderDelivered(handler: (order: OrderSnapshot) => void): () => void;
    private requireToken;
}
//# sourceMappingURL=orders.d.ts.map