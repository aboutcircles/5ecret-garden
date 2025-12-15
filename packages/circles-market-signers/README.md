# @circles-market/signers

Helpers for Safe-based signing used by Circles Market authentication and offer publishing.

It builds EIP-712 typed data for `SafeMessage(bytes)` and signs it using an EIP-1193 provider (`eth_signTypedData_v4`).

## Install

```bash
pnpm add @circles-market/signers
```

## Exports

* `WalletProvider` (EIP-1193 compatible)
* `AvatarSigner` (signs bytes for a specific Safe/avatar + chain)
* `SignersClient`, `SignersClientImpl`

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

## Return types

### `SignersClientImpl.createSafeSignerForAvatar({ avatar, ethereum, chainId, enforceChainId? })`

Returns: `Promise<AvatarSigner>`

Fields on `AvatarSigner`:
- `avatar`: lowercased Safe address
- `chainId`: bigint chain id
- `signBytes(payload: Uint8Array)`: returns a hex signature string (`0x...`)

Notes:
- throws `Wrong chain. Expected ... got ...` when `enforceChainId: true` and wallet is on different chain
- throws `No EOA account unlocked in wallet` if `eth_requestAccounts` returns empty

## Notes

* `enforceChainId: true` will call `eth_chainId` and throw if the wallet is on the wrong chain.
* The signer assumes the wallet can provide an owner EOA via `eth_requestAccounts`.
