# @circles-market/catalog

Read-only access to aggregated operator catalogs (no auth).

## Install

```bash
pnpm add @circles-market/catalog @circles-market/core
```

## Quickstart

```ts
import { CatalogClientImpl } from "@circles-market/catalog";

async function fetchFirstPage(marketApiBase: string, operator: string, sellers: string[]) {
  const catalog = new CatalogClientImpl(marketApiBase);

  const page = await catalog.fetchCatalogPage({
    operator,
    avatars: sellers,
    chainId: 100,
    pageSize: 50,
  });

  return page.items;
}
```

## Quickstart (lookup by seller + sku)

```ts
import { CatalogClientImpl } from "@circles-market/catalog";

async function fetchSellerSku(marketApiBase: string, operator: string, seller: string, sku: string) {
  const catalog = new CatalogClientImpl(marketApiBase);

  const item = await catalog
    .forOperator(operator)
    .fetchProductForSellerAndSku(seller, sku, { chainId: 100, maxPages: 10 });

  return item;
}
```

## Reference

### Concepts

* `operator`: operator address serving the aggregation endpoint
* `avatars`: seller/avatar addresses to include
* pagination:
  * cursor-based (`X-Next-Cursor` / `cursor`)
  * sometimes Link header (`rel="next"`)
  * status `416`: out-of-range / no more pages

### API and return values

* `fetchCatalogPage(query)` → `CatalogPage`
* `forOperator(operator).fetchCatalogPage(queryWithoutOperator)` → `CatalogPage`
* `forOperator(operator).fetchSellerCatalog(seller, opts?)` → `AggregatedCatalogItem[]`
* `forOperator(operator).fetchProductForSellerAndSku(seller, sku, opts?)` → `AggregatedCatalogItem | null`

### Types

#### `CatalogPage`
Fields:
- `catalog`: `AggregatedCatalog | null` (backend may omit)
- `items`: `AggregatedCatalogItem[]`
- `nextCursor`: cursor string or `null`
- `nextLink`: next URL or `null`
- `status`: HTTP status code

#### `AggregatedCatalogItem`
Fields:
- `seller`: seller/avatar address
- `productCid`: IPFS CID of product JSON-LD
- `publishedAt`: numeric timestamp (backend-defined unit)
- `linkKeccak`: link identifier/hash
- `indexInChunk`: position inside aggregation chunk
- `product`: `SchemaOrgProductLite`

#### `SchemaOrgProductLite`
Fields:
- `sku`, `name`: primary fields for checkout
- `description?`, `image?`, `url?`, `brand?`, `mpn?`, `gtin13?`, `category?`
- `offers`: `SchemaOrgOfferLite[]` (price/currency/availability/etc.)

## Runtime notes

* Requires global `fetch`.
* There’s an internal 10s memoization cache for pages to avoid spamming the same URL.

## Related packages

* `@circles-market/cart` uses SKUs + sellers from catalog results
* `@circles-market/sdk` gives you catalog + cart + orders in one client
