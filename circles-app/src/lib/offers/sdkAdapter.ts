// circles-app/src/lib/offers/sdkAdapter.ts
import type { SafeSignerLike } from '$lib/offers/client';
import type { AvatarSigner } from '@circles-market/sdk';

export function toSdkAvatarSigner(
  avatar: string,
  chainId: number,
  safe: SafeSignerLike
): AvatarSigner {
  return {
    avatar: avatar.toLowerCase(),
    chainId: BigInt(chainId),
    async signBytes(payload: Uint8Array) {
      const sig = await safe.sign(payload);
      return sig as `0x${string}`;
    },
  };
}
