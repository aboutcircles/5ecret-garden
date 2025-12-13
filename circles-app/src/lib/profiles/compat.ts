// src/lib/profiles/compat.ts
import type { AppProfile, AppProfileCore } from './types';
import type { Profile as CirclesSdkProfile } from '@circles-sdk/profiles';

export function toCirclesSdkProfileInput(p: AppProfile | AppProfileCore): CirclesSdkProfile {
  return {
    name: (p as any)?.name ?? '',
    description: (p as any)?.description ?? undefined,
    location: (p as any)?.location ?? undefined,
    previewImageUrl: (p as any)?.previewImageUrl ?? undefined,
    imageUrl: (p as any)?.imageUrl ?? undefined,
  } as CirclesSdkProfile;
}
