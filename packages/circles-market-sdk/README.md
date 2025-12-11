# Circles Market SDK

TypeScript SDK for building buyers’ experiences on the Circles Market API.

- Safe-based authentication (SIWE over SafeMessage bytes)
- Buyer-scoped Orders API (list, details, status history)
- Server‑Sent Events (SSE) for live order status updates

## Installation

```bash
npm install @circles-market/sdk
# or
pnpm add @circles-market/sdk
```

## Quickstart

```ts
import { CirclesClient } from '@circles-market/sdk';

// 1) Initialize client
const client = new CirclesClient({ marketApiBase: 'https://market.aboutcircles.com' });

// 2) Sign in as an avatar Safe using an EIP-1193 wallet (window.ethereum)
await client.auth.signInWithAvatar({
  avatar: '0xYourSafeAddress',
  ethereum: window.ethereum,
  chainId: 100, // Gnosis Chain (default)
});

// 3) List your orders
const orders = await client.orders.list();
console.log('My orders:', orders.map(o => ({ id: o.orderNumber, status: o.orderStatus })));

// 4) React to delivered orders or payment completion
const unsubscribe = client.orders.onOrderDelivered((order) => {
  console.log('Delivered:', order.orderNumber, order.outbox);
});

// Later: unsubscribe from SSE
// unsubscribe();
```

## Concepts

### Avatars are Safes

Authentication uses a Safe-based SIWE flow:

1. The backend issues a challenge string.
2. You sign the raw UTF‑8 bytes with EIP‑712 SafeMessage(bytes), domain verifyingContract set to the avatar Safe address.
3. The backend verifies and returns a short‑lived JWT, which the SDK stores in an AuthContext.

The SDK ships with an in‑memory AuthContext. You can provide your own by implementing the `AuthContext` interface.

### Orders and status IRIs

- Orders follow schema.org’s `Order` model.
- `orderStatus` values are full IRIs, e.g. `https://schema.org/OrderPaymentDue`, `https://schema.org/OrderDelivered`.
- The `outbox` contains arbitrary JSON‑LD payloads (download links, vouchers, etc.). Inspect `payload['@type']` or a `type` field if present.

### SSE events

- `orders.subscribeStatusEvents(handler)` opens a one‑way SSE stream and calls you with parsed JSON payloads.
- `orders.onOrderDelivered(handler)` is a convenience that fetches the fresh order snapshot when status becomes Delivered or PaymentComplete.
- Auto‑reconnect is not built-in; you can re‑subscribe on error as needed.

## API surface

- `CirclesClient`
  - `auth.signInWithAvatar({ avatar, ethereum, chainId? })`
  - `auth.signOut()`
  - `auth.getAuthMeta()`
  - `orders.list({ page?, pageSize? })`
  - `orders.getById(orderId)`
  - `orders.getStatusHistory(orderId)`
  - `orders.subscribeStatusEvents(onEvent)` → `unsubscribe()`
  - `orders.onOrderDelivered(onOrder)` → `unsubscribe()`
  - `cart.createBasket({ buyer, operator, chainId? })`
  - `cart.setItems({ basketId, items })`
  - `cart.setCheckoutDetails({ basketId, shippingAddress?, billingAddress?, contactPoint?, ageProof? })`
  - `cart.validateBasket(basketId)`
  - `cart.previewOrder(basketId)`
  - `cart.checkoutBasket({ basketId, buyer? })`
  - `offers?.publishOffer({ avatar, operator, signer, chainId?, product, offer })`
  - `offers?.tombstone({ avatar, operator, signer, chainId?, sku })`

## Cart

- Endpoints map 1:1 to the Circles Market Cart API.
- Auth is optional: the SDK automatically attaches the JWT if you are signed in, but all cart calls work for anonymous users too.
- Item shape follows schema.org JSON‑LD and the backend spec: `{ seller, orderedItem: { '@type': 'Product', sku }, orderQuantity, imageUrl? }`.
- Checkout details use the proper JSON‑LD `@type`s: `PostalAddress`, `ContactPoint`, `Person`.

## Offers (experimental but spec-aligned)

The `client.offers` module implements the same Profiles + Namespaces + CustomDataLink + Safe-signature pipeline used in the app. To enable it, you must pass a `profilesBindings` implementation when constructing `CirclesClient` so the SDK can pin JSON‑LD to IPFS and update the on‑chain profile digest.

```ts
import { CirclesClient } from '@circles-market/sdk';

const client = new CirclesClient({
  marketApiBase: 'https://market.aboutcircles.com',
  profilesBindings: bindings, // see below
});

const signer = await client.signers.createSafeSignerForAvatar({
  avatar: '0xSellerSafe',
  ethereum: window.ethereum,
  chainId: 100n,
  enforceChainId: true,
});

const res = await client.offers!.publishOffer({
  avatar: '0xSellerSafe',
  operator: '0xMarketOperator',
  signer,
  chainId: 100,
  product: { sku: 'coffee-250g', name: 'Coffee 250g' },
  offer: { price: 10, priceCurrency: 'CRC' },
});
```

`profilesBindings` must provide IPFS pinning and profile helpers:

```ts
export interface ProfilesBindings {
  putJsonLd(obj: any): Promise<string>;
  getJsonLd(cid: string): Promise<any>;
  getLatestProfileCid(avatar: string): Promise<string | null>;
  updateAvatarProfileDigest(avatar: string, profileCid: string): Promise<string | void>;
  canonicalizeJsonLd?(obj: any): Promise<string> | string;
}
```

The Offers client returns CIDs for the product payload and updated namespace/index/profile heads and will sign `CustomDataLink` envelopes using the provided Safe signer. It also attaches a PayAction to the first offer to align with the app’s behavior.

## Notes & semantics

- `AuthContext.getMeta()` returns null once the token expires (SDK enforces a small grace window).
- `OrderOutboxItem` is forward‑compatible: some backends return `{ id, source, createdAt, payload }`, others `{ type, payload, createdAt }`.
- HTTP errors include the raw response body whenever possible to aid debugging.

## License

MIT
