import type { AvatarRow, AvatarInfo } from '@aboutcircles/sdk-types';
import { get } from 'svelte/store';
import { circles } from '$lib/shared/state/circles';

function isAvatarInfo(avatar: AvatarRow | AvatarInfo): avatar is AvatarInfo {
  return 'hasV1' in avatar;
}

export function canMigrate(avatar: AvatarRow | AvatarInfo): boolean {
  const sdk = get(circles);
  // Check that v2 hub is configured (new SDK stores it in circlesConfig)
  if (!sdk?.circlesConfig?.v2HubAddress) {
    return false;
  }

  // Pure v1 avatars can migrate
  if (avatar.version === 1) {
    return true;
  }

  // v2 avatars can migrate if they have a v1 token and it's not stopped
  if (isAvatarInfo(avatar) && avatar.hasV1 && avatar.version === 2) {
    return (avatar.v1Token !== undefined && avatar.v1Token !== null && !avatar.v1Stopped) ?? false;
  }

  return false;
}
