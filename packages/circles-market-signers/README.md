# @circles-market/signers

Helpers for Safe-based signing used by Circles Market authentication and offer publishing.

It builds EIP-712 typed data for `SafeMessage(bytes)` and signs it using an EIP-1193 provider (`eth_signTypedData_v4`).

## Install

```bash
pnpm add @circles-market/signers
```

## Quickstart

```ts
import { SignersClientImpl } from "@circles-market/signers";

async function createSigner(ethereum: { request: (args: any) => Promise<any> }, avatar: string) {
  const signers = new SignersClientImpl();

  const signer = await signers.createSafeSignerForAvatar({
    avatar,
    ethereum,
    chainId: 100n,
    enforceChainId: true,
  });

  const sig = await signer.signBytes(new TextEncoder().encode("hello"));
  return sig;
}
```

## Reference

### Concepts

* Safe-based SIWE-style signing using `SafeMessage(bytes)`.
* Uses an EIP-1193-compatible wallet/provider to sign typed data (`eth_signTypedData_v4`).

### API and return values

* `createSafeSignerForAvatar({ avatar, ethereum, chainId, enforceChainId? })` → `Promise<AvatarSigner>`
  * `avatar`: Safe/avatar address (lowercased internally)
  * `chainId`: bigint chain id to bind the signer to
  * `enforceChainId?`: when `true`, the wallet chain is checked via `eth_chainId`

Errors you can see:
* `Wrong chain. Expected ... got ...` → wallet on different chain while `enforceChainId: true`.
 * `No EOA account unlocked in wallet` → `eth_requestAccounts` returned empty.

### Types

`AvatarSigner` fields:
- `avatar`: lowercased Safe address
- `chainId`: bigint chain id
- `signBytes(payload: Uint8Array)`: returns a hex signature string (`0x...`)

### Runtime notes

* `enforceChainId: true` will call `eth_chainId` and throw if the wallet is on the wrong chain.
* The signer assumes the wallet can provide an owner EOA via `eth_requestAccounts`.

## Related packages

* `@circles-market/auth` uses an `AvatarSigner` to sign challenges
* `@circles-market/offers` uses an `AvatarSigner` to publish/tombstone offers
* `@circles-market/sdk` wires these together if you need a full client
