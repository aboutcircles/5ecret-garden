# @circles-market/orders

Buyer-scoped order operations (requires a valid session token in `AuthContext`).

## Install

```bash
pnpm add @circles-market/orders @circles-market/core @circles-market/session
```

## Quickstart (list orders)

```ts
import { FetchHttpTransport } from "@circles-market/core";
import { InMemoryAuthContext } from "@circles-market/session";
import { OrdersClientImpl } from "@circles-market/orders";

async function listOrders(marketApiBase: string, session: InMemoryAuthContext) {
  const http = new FetchHttpTransport();
  const orders = new OrdersClientImpl(marketApiBase, http, session);

  return await orders.list({ page: 1, pageSize: 50 });
}
```

## Quickstart (subscribe to status events)

```ts
import { OrdersClientImpl } from "@circles-market/orders";

function subscribe(orders: OrdersClientImpl) {
  const unsubscribe = orders.subscribeStatusEvents((evt) => {
    console.log(evt.orderId, evt.oldStatus, evt.newStatus, evt.changedAt);
  });

  return unsubscribe;
}
```

## Reference

### Concepts

* Orders are returned as snapshots with schema.org-like fields.
* Status values are IRIs like `https://schema.org/OrderDelivered`.
* SSE emits `order-status` events; the client does not auto-reconnect.

### API and return values

* `list({ page?, pageSize? })` → `OrderSnapshot[]`
* `getById(orderId)` → `OrderSnapshot | null` (returns `null` on 404)
* `getStatusHistory(orderId)` → `OrderStatusHistory`
* `getOrdersBatch(ids)` → `OrderSnapshot[]`
* `subscribeStatusEvents(handler)` → `() => void` (unsubscribe)
* `onOrderDelivered(handler)` → `() => void` (unsubscribe)

### Types

#### `OrderSnapshot`
Fields:
- `orderNumber`: order identifier (string)
- `orderStatus?`: status IRI string
- `orderDate?`: ISO date/time string
- `paymentReference?`: backend-issued reference
- `outbox?`: `OrderOutboxItem[]`
- `[k: string]: unknown`: forward-compat fields

#### `OrderOutboxItem`
Fields:
- `id?`: numeric id (optional)
- `source?`: source label (optional)
- `type?`: consumer label (optional)
- `payload`: arbitrary JSON/JSON-LD
- `createdAt?`: ISO date/time (optional)

#### `OrderStatusHistory`
Fields:
- `events`: list of `{ oldStatus, newStatus, changedAt }`

#### `OrderStatusEventPayload` (SSE)
Fields:
- `orderId`, `oldStatus`, `newStatus`, `changedAt`

## Runtime notes

* Requires global `fetch`.
* SSE requires `ReadableStream` support (`Response.body.getReader()`).

## Related packages

* `@circles-market/cart` produces `orderId` / `paymentReference` on checkout
* `@circles-market/auth` + `@circles-market/session` for session management
* `@circles-market/sdk` for the full flow
