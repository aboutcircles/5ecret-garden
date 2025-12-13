/**
 * Server-provided outbox entry associated with an order.
 *
 * The backend may use either a compact `{ type, payload, createdAt }` shape or
 * a richer `{ id, source, createdAt, payload }` shape. This type is forward-compatible.
 */
export interface OrderOutboxItem {
    /** Optional numeric id if provided by backend. */
    id?: number;
    /** Optional source label (e.g., "fulfillment"). */
    source?: string | null;
    /** Consumer-friendly type label (may mirror payload['@type'] or a human label). */
    type?: string;
    /** Arbitrary JSON-LD payload (e.g., links, vouchers). */
    payload: unknown;
    /** ISO timestamp when the outbox entry was created. */
    createdAt?: string;
}
/**
 * Minimal view of a schema.org Order as returned by the Market API.
 *
 * Notes:
 * - `orderStatus` is a full schema.org IRI (e.g., https://schema.org/OrderDelivered).
 * - `outbox` contains arbitrary JSON-LD payloads added by the server.
 * - Unknown fields are preserved to keep the SDK forward-compatible.
 */
export interface OrderSnapshot {
    /** schema.org Order identifier like orderNumber */
    orderNumber: string;
    /** schema.org IRI like https://schema.org/OrderDelivered */
    orderStatus?: string;
    /** ISO date when the order was placed */
    orderDate?: string;
    /** Optional payment reference issued by backend for convenience */
    paymentReference?: string;
    /** Arbitrary outbox payloads (download links, vouchers, etc.) */
    outbox?: OrderOutboxItem[];
    /** Allow extra properties from backend without strict typing for forward-compat */
    [k: string]: unknown;
}
/** Payload for a single order-status change event (SSE). */
export interface OrderStatusEventPayload {
    orderId: string;
    oldStatus: string | null;
    newStatus: string;
    changedAt: string;
}
/** A single entry in the status history timeline for an order. */
export interface OrderStatusHistoryEvent {
    oldStatus: string | null;
    newStatus: string;
    changedAt: string;
}
/** Container for an order's status history. */
export interface OrderStatusHistory {
    events: OrderStatusHistoryEvent[];
}
//# sourceMappingURL=ordersTypes.d.ts.map