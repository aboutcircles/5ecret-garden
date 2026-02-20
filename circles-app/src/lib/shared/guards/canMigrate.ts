import type { AvatarInfo, AvatarRow } from '@aboutcircles/sdk-types';
import { get } from 'svelte/store';
import { circles } from '$lib/shared/state/circles';

function isAvatarInfo(a: AvatarInfo | AvatarRow): a is AvatarInfo {
  return 'hasV1' in a;
}

export function canMigrate(avatar: AvatarInfo | AvatarRow): boolean {
  const sdk = get(circles);
  if (!sdk?.circlesConfig?.v2HubAddress) {
    return false;
  }

  // Pure v1 avatars can migrate
  if (avatar.version === 1) {
    return true;
  }

  // v2 avatars with v1 legacy — only available on AvatarInfo (richer type)
  if (isAvatarInfo(avatar) && avatar.hasV1 && avatar.version === 2) {
    return (avatar.v1Token !== null && !avatar.v1Stopped) ?? false;
  }

  return false;
}
