import type { AvatarInfo } from '@aboutcircles/sdk-types';

export function canInvite(avatar: AvatarInfo): boolean {
  // Invitations only work for human v2 avatars.
  // If they have a v1 token, it must be stopped.

  return avatar.version === 2 && avatar.isHuman;
}
