# @circles-market/sdk

Client that wires the domain packages together (auth, catalog, cart, orders; optional offers).

## Install

```bash
pnpm add @circles-market/sdk
```

## Quickstart (full flow)

```ts
import { MarketplaceClient } from "@circles-market/sdk";

async function example(marketApiBase: string, ethereum: any, avatar: string) {
  const client = new MarketplaceClient({ marketApiBase });

  await client.auth.signInWithAvatar({ avatar, ethereum, chainId: 100 });

  const catalogPage = await client.catalog.fetchCatalogPage({
    operator: "0x0000000000000000000000000000000000000000",
    avatars: ["0x0000000000000000000000000000000000000000"],
    chainId: 100,
    pageSize: 25,
  });

  const { basketId } = await client.cart.createBasket({
    buyer: avatar,
    operator: "0x0000000000000000000000000000000000000000",
    chainId: 100,
  });

  await client.cart.setItems({
    basketId,
    items: [
      { seller: catalogPage.items[0]!.seller, sku: catalogPage.items[0]!.product.sku, quantity: 1 },
    ],
  });

  const validation = await client.cart.validateBasket(basketId);
  if (!validation.valid) {
    return validation;
  }

  const checkout = await client.cart.checkoutBasket({ basketId });
  return checkout;
}
```

## Reference

### What the client exposes

* `client.catalog` → `@circles-market/catalog`
* `client.cart` → `@circles-market/cart`
* `client.orders` → `@circles-market/orders`
* `client.auth` / `client.signers` / `client.authContext`
* `client.offers` → only if you pass `profilesBindings`

### `MarketplaceClientOptions`

```ts
type MarketplaceClientOptions = {
  marketApiBase: string;
  http?: HttpTransport;
  authContext?: AuthContext;
  profilesBindings?: ProfilesBindings;
};
```

Fields:
- `marketApiBase`: base URL (SDK normalizes trailing slash)
- `http`: optional transport (default: `FetchHttpTransport`)
- `authContext`: optional token store (default: `InMemoryAuthContext`)
- `profilesBindings`: required only for `client.offers`

### Return types (high-level)

Same return types as the domain packages:
- `client.auth.signInWithAvatar(...)` → `{ address: string; chainId: number }`
- `client.cart.createBasket(...)` → `{ basketId: string }`
- `client.cart.checkoutBasket(...)` → `{ orderId: string; paymentReference: string; basketId: string }`
- `client.orders.list(...)` → `OrderSnapshot[]`
- `client.catalog.fetchCatalogPage(...)` → `CatalogPage`

For field-by-field docs, see the corresponding package README.

## Using only one domain package

If you want only one domain:

* just catalog browsing → `@circles-market/catalog`
* only basket operations → `@circles-market/cart`
* only orders → `@circles-market/orders`

## Runtime notes

* Requires global `fetch` (Node 18+ is fine).
* Orders SSE uses `Response.body.getReader()`.
