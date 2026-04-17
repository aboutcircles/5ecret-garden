# @circles-market/core

HTTP transport and validators used by the other packages.

## Install

```bash
pnpm add @circles-market/core
```

## Quickstart

```ts
import { FetchHttpTransport, HttpError, normalizeEvmAddress } from "@circles-market/core";

async function main() {
  const http = new FetchHttpTransport();
  const operator = normalizeEvmAddress("0x0000000000000000000000000000000000000000");

  try {
    const res = await http.request<{ ok: boolean }>({
      method: "GET",
      url: `https://example.invalid/api/operator/${operator}/health`,
    });
    return res.ok;
  } catch (e) {
    if (e instanceof HttpError) {
      throw new Error(`Market API error: ${e.status} ${e.statusText}`);
    }
    throw e;
  }
}
```

## Reference

### Exports

* `FetchHttpTransport`, `HttpTransport`, `HttpError`
* validators: `normalizeEvmAddress`, `isEvmAddress`, `isAbsoluteUri`, `isValidSku`, `assertSku`, `normalizeHex32`

### Return types

#### `HttpTransport.request<T>(opts)` → `Promise<T>`
Notes:
- parses JSON when `content-type` contains `json` (including `application/ld+json`)
- otherwise returns response text (typed as `T` by the caller)

#### `HttpError`
Fields:
- `status`, `statusText`, `body`

#### Validators
* `normalizeEvmAddress(value)` → lowercased `0x...` string (throws on invalid)
* `isEvmAddress(value)` → boolean
* `isAbsoluteUri(value)` → boolean
* `isValidSku(sku)` → boolean (`^[a-z0-9][a-z0-9-_]{0,62}$`)
* `assertSku(sku)` → void (throws `Error("Invalid SKU")`)
* `normalizeHex32(value, name)` → `Hex | undefined` (throws on invalid)

## Notes

* Requires a global `fetch` implementation.
* Validators are strict on purpose. If you pass unknown user input, validate early.
