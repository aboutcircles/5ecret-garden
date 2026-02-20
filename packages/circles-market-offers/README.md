# @circles-market/offers

Publish and tombstone offers by writing product JSON-LD to IPFS and updating the avatar profile namespace.

## Install

```bash
pnpm add @circles-market/offers @circles-market/core @circles-market/signers
```

## Quickstart (publish)

```ts
import { OffersClientImpl, buildProduct } from "@circles-market/offers";

async function publishExample(bindings: any, signer: any) {
  const offers = new OffersClientImpl(bindings);

  return await offers.publishOffer({
    avatar: "0x0000000000000000000000000000000000000000",
    operator: "0x0000000000000000000000000000000000000000",
    signer,
    chainId: 100,
    product: {
      sku: "coffee-1",
      name: "Coffee Beans",
      image: "https://example.com/coffee.jpg",
    },
    offer: {
      price: 10,
      priceCurrency: "EUR",
      fulfillmentTrigger: "confirmed",
    },
  });
}
```

## Quickstart (tombstone)

```ts
import { OffersClientImpl } from "@circles-market/offers";

async function tombstoneExample(bindings: any, signer: any) {
  const offers = new OffersClientImpl(bindings);
  return await offers.tombstone({
    avatar: "0x0000000000000000000000000000000000000000",
    operator: "0x0000000000000000000000000000000000000000",
    signer,
    chainId: 100,
    sku: "coffee-1",
  });
}
```

## Reference

### Requirements

* `ProfilesBindings` implementation (IPFS + chain update hooks)
* `AvatarSigner` for the publishing avatar (Safe-based signing)

### API and return values

* `publishOffer({...})` → `{ productCid, headCid, indexCid, profileCid, digest32, txHash? }`
  * `productCid`: CID of published product JSON-LD
  * `headCid`, `indexCid`, `profileCid`: CIDs produced by the profile/index update
  * `digest32`: 32-byte hex digest derived from `profileCid`
  * `txHash?`: optional tx hash returned by bindings
* `tombstone({...})` → `{ headCid, indexCid, profileCid, digest32, txHash? }`
  * same meaning as `publishOffer`, but for tombstone payload

### `buildProduct(product, offer)` output

Returns a JSON-LD object with:
- `@context`: schema.org + circles-market context
- `@type`: "Product"
- required: `sku`, `name`
- optional: `description`, `url`, `brand`, `mpn`, `gtin13`, `category`, `image`
- `offers`: array with a single `Offer` including `{ price, priceCurrency }` and optional fields like
  `availabilityFeed`, `inventoryFeed`, `availableDeliveryMethod`, `requiredSlots`, `fulfillmentEndpoint`, `fulfillmentTrigger`

Validation:
- `price > 0`
- `priceCurrency` is 3 uppercase letters
- URL-ish fields are absolute URLs
- JSON-LD size ≤ 8 MiB

## Notes

`tombstone()` writes a Tombstone JSON-LD payload and inserts a link for the same `product/<sku>` name, so the index consumers can treat it as removed.

## Errors you’ll see

* `Invalid SKU` → doesn’t match the allowed SKU pattern.
* `UrlValidationError` → non-absolute URL in image/product/offer fields.
* `ObjectTooLargeError` → JSON-LD exceeded 8 MiB cap.
* `Signer avatar mismatch` / `Signer chainId mismatch` → you’re signing with the wrong Safe or wrong chain.

## Related packages

* `@circles-market/signers` to build an `AvatarSigner`
* `@circles-profile/core` defines the `ProfilesBindings` shape you need to implement
* `@circles-market/sdk` if you want this alongside catalog/cart/orders
