# @circles-market/cart

Basket/cart operations against the Market API (create basket, set items, validate, preview, checkout).

## Install

```bash
pnpm add @circles-market/cart @circles-market/core @circles-market/session
```

## Quickstart

```ts
import { FetchHttpTransport } from "@circles-market/core";
import { InMemoryAuthContext } from "@circles-market/session";
import { CartClientImpl } from "@circles-market/cart";

async function checkoutExample(marketApiBase: string) {
  const http = new FetchHttpTransport();
  const session = new InMemoryAuthContext();

  const cart = new CartClientImpl(marketApiBase, http, session);

  const { basketId } = await cart.createBasket({
    buyer: "0x0000000000000000000000000000000000000000",
    operator: "0x0000000000000000000000000000000000000000",
    chainId: 100,
  });

  await cart.setItems({
    basketId,
    items: [
      { seller: "0x0000000000000000000000000000000000000000", sku: "coffee-1", quantity: 2 },
    ],
  });

  await cart.setCheckoutDetails({
    basketId,
    contactPoint: { email: "buyer@example.com" },
    shippingAddress: { addressCountry: "DE", postalCode: "10115" },
  });

  const validation = await cart.validateBasket(basketId);
  if (!validation.valid) {
    return validation;
  }

  const preview = await cart.previewOrder(basketId);
  const checkout = await cart.checkoutBasket({ basketId });

  return { preview, checkout };
}
```

## Reference

### Concepts

* A `Basket` is server state identified by `basketId`.
* `items` reference sellers + product SKUs.
* Many endpoints can use auth (`AuthContext` token). Checkout flows usually do.

### API and return values

* `createBasket({ buyer, operator, chainId? })` → `{ basketId: string }`
  * `basketId`: server-generated identifier
* `setItems({ basketId, items })` → `Basket`
* `setCheckoutDetails({ basketId, shippingAddress?, billingAddress?, contactPoint?, ageProof? })` → `Basket`
* `validateBasket(basketId)` → `ValidationResult`
* `previewOrder(basketId)` → `any`
  * backend-defined JSON object; treat as opaque unless you control the backend schema
* `checkoutBasket({ basketId, buyer? })` → `{ orderId: string; paymentReference: string; basketId: string }`
  * `orderId`: use with `@circles-market/orders`
  * `paymentReference`: backend-issued reference
  * `basketId`: echoed basket id

### Types

#### `BasketItemInput`
Fields:
- `seller`: seller/avatar EVM address (`0x...`)
- `sku`: product SKU (typically from `@circles-market/catalog`)
- `quantity`: integer quantity
- `imageUrl?`: optional UI hint

#### `Basket`
Fields:
- `basketId`: basket identifier
- `buyer?`: buyer address (when provided/known)
- `operator?`: operator address (when provided/known)
- `chainId`: chain id (default `100` when created by SDK)
- `items`: `BasketItem[]` (server-side basket line shape; see below). Backend may add extra fields via `[k: string]: unknown`.
- `status`: backend-defined status string
- `[k: string]: unknown`: forward-compat for backend-added fields

#### `BasketItem` (server basket line shape)
Fields (all optional unless noted by backend):
- `@type?`: typically "OrderItem"
- `orderQuantity?`: number
- `orderedItem?`: `{ '@type'?: string; sku?: string; [k: string]: unknown }`
- `seller?`: seller/avatar EVM address (`0x...`)
- `imageUrl?`: optional UI hint
- `productCid?`, `offerSnapshot?`: optional provenance fields that the server may include
- `[k: string]: unknown`: forward-compat for backend-added fields

#### `PostalAddressInput`
Fields (all optional):
- `streetAddress`, `addressLocality`, `postalCode`, `addressCountry`

#### `ContactPointInput`
Fields (all optional):
- `email`, `telephone`

#### `PersonMinimalInput`
Fields (all optional):
- `birthDate`: ISO date string (e.g. "1990-01-01")

#### `ValidationResult`
Fields:
- `valid`: `true` if checkout should be possible
- `requirements`: backend-defined requirement list
- `missing`: backend-defined missing-fields list
- `ruleTrace`: backend-defined rule evaluation trace

## Related packages

* `@circles-market/catalog` to discover valid `{ seller, sku }` pairs
* `@circles-market/auth` + `@circles-market/session` for authenticated checkout flows
* `@circles-market/sdk` if you don’t want to wire the dependencies yourself
