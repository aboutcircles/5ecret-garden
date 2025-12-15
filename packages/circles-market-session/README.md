# @circles-market/session

Token storage for authenticated Market API calls.

This package is intentionally tiny: it stores a JWT + associated metadata and gives you a safe `getToken()` that returns `null` when the token is expired (with a small grace window).

## Install

```bash
pnpm add @circles-market/session
```

## Exports

* `AuthContext` (interface)
* `InMemoryAuthContext` (default implementation)
* `AuthContextMeta`

## Return types

### `InMemoryAuthContext.setToken(token, expiresInSeconds, address, chainId)`

Returns: `void`

Side effects:
- stores `{ token, expiresAt, address, chainId }`

### `InMemoryAuthContext.getToken()`

Returns: `string | null` (null when expired or not set)

### `InMemoryAuthContext.getMeta()`

Returns:

```ts
type AuthMeta = { address: string; chainId: number } | null;
```

Fields (when not `null`):
- `address`: authenticated avatar address (lowercased)
- `chainId`: chain id associated with the token

### `InMemoryAuthContext.clear()`

Returns: `void` (clears token + metadata)

## Quickstart

```ts
import { InMemoryAuthContext } from "@circles-market/session";

const session = new InMemoryAuthContext();

session.setToken("jwt-token", 60, "0x0000000000000000000000000000000000000000", 100);

const token = session.getToken();
if (!token) {
  throw new Error("Not authenticated");
}

const meta = session.getMeta();
```

## When you need this

* You’re using `@circles-market/auth` to log in and you want other clients (`orders`, `cart`) to automatically pick up the session.
* You want to provide your own storage (e.g. localStorage, encrypted store). Implement the `AuthContext` interface.
