// circles-app/src/lib/offers/profilesBindings.ts
import { get } from 'svelte/store';
import { circles } from '$lib/shared/state/circles';
import { createCirclesSdkProfilesBindings } from '@circles-profile/core';
import type { ProfilesBindings } from '@circles-market/sdk';

export type ProfilesBindingsWithMedia = {
  bindings: ProfilesBindings;
  media?: {
    pinMediaBytes: (bytes: Uint8Array, mime?: string | null) => Promise<string>;
    gatewayUrlForCid: (cid: string) => string;
  };
};

export function getProfilesBindings(params?: {
  pinApiBase?: string;
  gatewayUrlForCid?: (cid: string) => string;
}): ProfilesBindingsWithMedia {
  const sdk = get(circles);
  if (!sdk) {
    throw new Error('Circles SDK not initialized');
  }

  const { pinApiBase, gatewayUrlForCid } = params ?? {};

  // Polyfill: @circles-profile/core was written for the old SDK which had
  // `sdk.data.getMetadataCidForAddress(addr)`. The new @aboutcircles/sdk uses
  // `sdk.data.getAvatar(addr)` → `.cidV0`. Patch the SDK object so the
  // compiled @circles-profile/core package finds the method it expects.
  const sdkPatched = Object.create(sdk);
  sdkPatched.data = Object.create(sdk.data);
  (sdkPatched.data as { getMetadataCidForAddress: (address: string) => Promise<string | null> }).getMetadataCidForAddress = async (address: string) => {
    const info = await sdk.data.getAvatar(address);
    return info?.cidV0 ?? null;
  };

  const { bindings: rawBindings, media } = createCirclesSdkProfilesBindings({
    circlesSdk: sdkPatched,
    pinApiBase,
    gatewayUrlForCid,
  });

  // Override updateAvatarProfileDigest: @circles-profile/core calls
  // `avatar.updateMetadata(cid)` but the new SDK uses `avatar.profile.updateMetadata(cid)`.
  const bindings: ProfilesBindings = {
    ...rawBindings,
    async updateAvatarProfileDigest(avatar: string, profileCid: string): Promise<string> {
      const avatarObj = await sdk.getAvatar(avatar);
      const tx = await avatarObj.profile.updateMetadata(profileCid);
      return tx?.transactionHash ?? '';
    },
  };

  return { bindings, media: pinApiBase ? media : undefined };
}
