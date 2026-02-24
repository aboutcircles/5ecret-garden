# @circles-market/sales

Seller-scoped read-only endpoints for the Market API (requires a valid seller session token in `AuthContext`).

## Install

```bash
pnpm add @circles-market/sales @circles-market/core @circles-market/session
```

## Quickstart (list seller orders)

```ts
import { FetchHttpTransport } from "@circles-market/core";
import { InMemoryAuthContext } from "@circles-market/session";
import { SalesClient } from "@circles-market/sales";

async function listSellerOrders(marketApiBase: string) {
  const http = new FetchHttpTransport();
  const session = new InMemoryAuthContext();
  const sales = new SalesClient(marketApiBase, http, session);

  return await sales.list({ page: 1, pageSize: 20 });
}
```

## Quickstart (get one by id)

```ts
import { SalesClient, isOrderId } from "@circles-market/sales";

async function getOrder(sales: SalesClient, id: string) {
  if (!isOrderId(id)) return null;
  const order = await sales.get(id);
  return order; // `null` when not found (404)
}
```

## Reference

### Concepts

* Seller-only view over orders created by buyers.
* Requires a valid JWT in `AuthContext` belonging to the seller avatar (address lowercased) and the right `chainId`.
* Pagination uses `page` + `pageSize` query params.

### API and return values

* `list({ page?, pageSize? })` → `SellerOrdersPage`
  * `items`: array of `SellerOrderDto`
* `get(orderId)` → `SellerOrderDto | null` (returns `null` on 404)

### Types

#### `SellerOrderDto`
Minimal schema (selected fields):
- `@context`: "https://schema.org/"
- `@type`: "Order"
- `orderNumber`: string
- `orderStatus`: IRI string
- `orderDate`: ISO date/time string
- `paymentReference`: string | null
- `broker`: opaque backend object
- `acceptedOffer`: `any[]` (filtered to this seller)
- `orderedItem`: `any[]` (filtered to this seller)
- `totalPaymentDue`: `any | null`
- `outbox?`: `any[]`
- `[k: string]: unknown` for forward compatibility

#### `SellerOrdersPage`
Fields:
- `items`: `SellerOrderDto[]`

#### `OrderId` and `isOrderId(s)`
- `OrderId`: branded string type
- `isOrderId(s: string)` → boolean (expects `ord_` + 32 uppercase hex chars)

## Runtime notes

* Requires global `fetch` (Node 18+ is fine).

## Related packages

* `@circles-market/auth` + `@circles-market/session` to obtain and store the seller JWT
* `@circles-market/orders` for buyer-scoped order views
* `@circles-market/sdk` if you want a single client wiring auth/catalog/cart/orders (and optionally offers)