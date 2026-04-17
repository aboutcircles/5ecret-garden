# @circles-market/auth

Authentication client for the Market API (Safe-based SIWE) that stores a JWT in an `AuthContext`.

## Install

```bash
pnpm add @circles-market/auth @circles-market/core @circles-market/session @circles-market/signers
```

## Quickstart

```ts
import { FetchHttpTransport } from "@circles-market/core";
import { InMemoryAuthContext } from "@circles-market/session";
import { SignersClientImpl } from "@circles-market/signers";
import { AuthClientImpl } from "@circles-market/auth";

async function signIn(marketApiBase: string, ethereum: any, avatar: string) {
  const http = new FetchHttpTransport();
  const session = new InMemoryAuthContext();
  const signers = new SignersClientImpl();

  const auth = new AuthClientImpl(marketApiBase, http, session, signers);
  await auth.signInWithAvatar({ avatar, ethereum, chainId: 100 });

  return session.getMeta();
}
```

## Reference

### API

* `AuthClientImpl.signInWithAvatar({ avatar, ethereum, chainId? })` → stores a JWT in the provided `AuthContext`
* `AuthClientImpl.signOut()` → clears the `AuthContext`
* `AuthClientImpl.getAuthMeta()` → reads auth metadata from the `AuthContext` (only if token is still valid)

### Return values

#### `signInWithAvatar(...)`

Returns:

```ts
type SignInResult = { address: string; chainId: number };
```

Fields:
* `address`: authenticated avatar address (stored lowercased by `InMemoryAuthContext`)
* `chainId`: chain id used for login (default: `100`)

Side effects:

* stores `{ token, expiresAt, address, chainId }` in the provided `AuthContext`

#### `getAuthMeta()`

Returns:

```ts
type AuthMeta = { address: string; chainId: number } | null;
```

Fields (when not `null`):

* `address`: authenticated avatar address
* `chainId`: chain id associated with the token

#### `signOut()`

Returns: `void` (clears token + metadata from the `AuthContext`).

### Notes

Safe-based SIWE flow:
1) request a challenge (`/api/auth/challenge`)
2) sign challenge bytes via Safe `SafeMessage(bytes)`
3) verify (`/api/auth/verify`) and store JWT

## Common errors

* `Wrong chain. Expected ... got ...` → wallet is on the wrong network.
* `No EOA account unlocked in wallet` → `eth_requestAccounts` returned no accounts.
* `Not authenticated` later in `orders/cart` → token expired or you never called sign-in.

## Related packages

* `@circles-market/session` for token storage
* `@circles-market/orders` and `@circles-market/cart` require a valid session
* `@circles-market/sdk` wires everything together for you
