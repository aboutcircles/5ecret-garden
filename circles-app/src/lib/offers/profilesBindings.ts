// circles-app/src/lib/offers/profilesBindings.ts
import { get } from 'svelte/store';
import { circles } from '$lib/stores/circles';
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

  const { bindings, media } = createCirclesSdkProfilesBindings({
    circlesSdk: sdk as any,
    pinApiBase,
    gatewayUrlForCid,
  });

  return { bindings, media: pinApiBase ? media : undefined };
}
