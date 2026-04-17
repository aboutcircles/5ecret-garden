# @circles-market/session

Token storage for authenticated Market API calls.

This package is intentionally tiny: it stores a JWT + associated metadata and gives you a safe `getToken()` that returns `null` when the token is expired (with a small grace window).

## Install

```bash
pnpm add @circles-market/session
```

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

## Reference

### Concepts

* Stores `{ token, expiresAt, address, chainId }` and hides expired tokens.
* `getToken()` returns `null` when token is missing or expired (with a small grace window).
* Lowercases the `address` for consistency.

### API and return values

* `setToken(token, expiresInSeconds, address, chainId)` → `void`
  * Stores token + metadata; calculates `expiresAt` from `expiresInSeconds`.
* `getToken()` → `string | null`
  * Returns `null` when token is expired or not set.
* `getMeta()` → `AuthMeta`
  * `{ address: string; chainId: number } | null` depending on validity of the token.
* `clear()` → `void`
  * Clears token + metadata.

### Types

* `AuthContext` (interface) — implement this to provide your own storage (e.g. localStorage, secure store).
* `InMemoryAuthContext` — default in-memory implementation.
* `AuthMeta`:

```ts
type AuthMeta = { address: string; chainId: number } | null;
```

### Runtime notes

* No external dependencies; works in browser and Node environments.
* Does not perform network calls.

## Related packages

* `@circles-market/auth` writes tokens into an `AuthContext` after sign-in.
* `@circles-market/orders`, `@circles-market/cart`, and `@circles-market/sales` read tokens from an `AuthContext`.
* `@circles-market/sdk` wires auth + session with the other domain clients.
